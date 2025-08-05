import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Vibration, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import CommentsModal from '../(modals)/CommentsModal';
import { PremiumAvatar } from './PremiumAvatar';

const { width } = Dimensions.get('window');

const FeedCard = ({
  avatarUrl,
  name,
  date,
  title,
  description,
  stats, // array of { label, value, highlight? }
  type, // 'workout' | 'mental' | 'pr' | 'run'
  targetId, // id of the workout/mental session
  isOwner,
  onEdit,
  style,
  userId,
  photoUrl,
  initialKudosCount = 0,
  initialHasKudoed = false,
  initialCommentCount = 0,
  username,
  // New props for run data
  runData, // { path, distance_meters, duration_seconds, start_time, end_time }
  showMapToOthers = true, // Whether to show the map to others
}) => {
  const [kudosCount, setKudosCount] = useState(initialKudosCount);
  const [hasKudoed, setHasKudoed] = useState(initialHasKudoed);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showComments, setShowComments] = useState(false);
  
  // Map-related state
  const [showInteractiveMap, setShowInteractiveMap] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [staticMapUrl, setStaticMapUrl] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  
  const router = useRouter();

  // Map utility functions
  const parseRunPath = (pathString) => {
    try {
      if (typeof pathString === 'string') {
        return JSON.parse(pathString);
      }
      return pathString || [];
    } catch (error) {
      console.error('Error parsing run path:', error);
      return [];
    }
  };

  const calculateMapRegion = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return null;
    
    const lats = coordinates.map(coord => coord.latitude);
    const lngs = coordinates.map(coord => coord.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = (maxLat - minLat) * 1.2; // Add 20% padding
    const lngDelta = (maxLng - minLng) * 1.2;
    
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latDelta, 0.01), // Minimum zoom level
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  };

  const generateStaticMapUrl = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return null;
    
    // Encode the path for Google Static Maps API
    const path = coordinates.map(coord => `${coord.latitude},${coord.longitude}`).join('|');
    
    // Calculate bounds for the map
    const lats = coordinates.map(coord => coord.latitude);
    const lngs = coordinates.map(coord => coord.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // Calculate optimal zoom level based on route bounds
    const latDelta = maxLat - minLat;
    const lngDelta = maxLng - minLng;
    const maxDelta = Math.max(latDelta, lngDelta);
    
    // Calculate zoom level (Google Maps zoom levels: 0-21)
    // Smaller delta = higher zoom (more zoomed in)
    let zoom = 15; // Default zoom for short routes
    if (maxDelta > 0.1) zoom = 10; // Very long routes
    else if (maxDelta > 0.05) zoom = 11; // Long routes
    else if (maxDelta > 0.02) zoom = 12; // Medium routes
    else if (maxDelta > 0.01) zoom = 13; // Short-medium routes
    else if (maxDelta > 0.005) zoom = 14; // Short routes
    else if (maxDelta > 0.001) zoom = 15; // Very short routes
    else zoom = 16; // Ultra short routes (like track runs)
    
    const apiKey = 'AIzaSyCqGOh4wjmj3CHim04fZbxAqM_Przqy024'; // From your app.config.js
    const mapSize = `${Math.round(width - 40)}x200`; // Account for card padding
    
    return `https://maps.googleapis.com/maps/api/staticmap?` +
           `center=${centerLat},${centerLng}&` +
           `path=color:0x00ffff|weight:4|${path}&` +
           `size=${mapSize}&` +
           `zoom=${zoom}&` +
           `maptype=roadmap&` +
           `key=${apiKey}`;
  };

  // Handle run data processing
  useEffect(() => {
    if (type === 'run' && runData) {
      setMapLoading(true);
      
      try {
        const coordinates = parseRunPath(runData.path);
        
        if (coordinates.length > 0) {
          // Calculate map region
          const region = calculateMapRegion(coordinates);
          setMapRegion(region);
          
          // Generate static map URL
          const staticUrl = generateStaticMapUrl(coordinates);
          setStaticMapUrl(staticUrl);
        }
      } catch (error) {
        console.error('Error processing run data:', error);
      } finally {
        setMapLoading(false);
      }
    }
  }, [type, runData]);

  // Update state when props change
  useEffect(() => {
    setKudosCount(initialKudosCount);
    setHasKudoed(initialHasKudoed);
    setCommentCount(initialCommentCount);
  }, [initialKudosCount, initialHasKudoed, initialCommentCount]);

  // Determine table and target column based on type
  let table = null;
  let targetColumn = null;
  let commentTable = null;
  let commentColumn = null;
  if (type === 'workout') {
    table = 'workout_kudos';
    targetColumn = 'workout_id';
    commentTable = 'workout_comments';
    commentColumn = 'workout_id';
  } else if (type === 'mental') {
    table = 'mental_session_kudos';
    targetColumn = 'session_id';
    commentTable = 'mental_session_comments';
    commentColumn = 'session_id';
  } else if (type === 'run') {
    table = 'run_kudos';
    targetColumn = 'run_id';
    commentTable = 'run_comments';
    commentColumn = 'run_id';
  }

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const handleKudos = async () => {
    if (!table || !targetColumn || !currentUserId || !targetId) return;
    
    // Optimistic update - update UI immediately
    const newHasKudoed = !hasKudoed;
    const newKudosCount = hasKudoed ? kudosCount - 1 : kudosCount + 1;
    setHasKudoed(newHasKudoed);
    setKudosCount(newKudosCount);
    
    // Very light tap feedback
    Vibration.vibrate(5);
    
    try {
      // Check if kudos already exists
      const { data: existingKudos, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq(targetColumn, targetId)
        .eq('user_id', currentUserId);

      if (fetchError) {
        // Revert optimistic update if there's an error
        setHasKudoed(!newHasKudoed);
        setKudosCount(!newKudosCount);
        throw fetchError;
      }

      if (existingKudos && existingKudos.length > 0) {
        // If kudos exists, remove it
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq(targetColumn, targetId)
          .eq('user_id', currentUserId);

        if (deleteError) {
          // Revert optimistic update if there's an error
          setHasKudoed(!newHasKudoed);
          setKudosCount(!newKudosCount);
          throw deleteError;
        }
      } else {
        // If no kudos exists, add it
        const { error: insertError } = await supabase
          .from(table)
          .insert([{
            [targetColumn]: targetId,
            user_id: currentUserId
          }]);

        if (insertError) {
          // Revert optimistic update if there's an error
          setHasKudoed(!newHasKudoed);
          setKudosCount(!newKudosCount);
          throw insertError;
        }
      }
    } catch (error) {
      console.error('Error toggling kudos:', error);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'workout':
        return 'barbell-outline';
      case 'mental':
        return 'leaf-outline';
      case 'pr':
        return 'trophy-outline';
      case 'run':
        return 'fitness-outline';
      default:
        return 'fitness-outline';
    }
  };

  return (
    <View style={[styles.card, style]}>  
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <TouchableOpacity onPress={() => router.push(`/profile/${userId}`)}>
            <PremiumAvatar
              userId={userId}
              source={avatarUrl ? { uri: avatarUrl } : null}
              size={44}
              style={styles.avatar}
              username={username}
              fullName={name}
            />
          </TouchableOpacity>
          <View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.date}>{date}</Text>
          </View>
        </View>
        {isOwner && onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Ionicons name="pencil" size={20} color="#00ffff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.titleContainer}>
        <Ionicons name={getIcon()} size={24} color="#00ffff" style={styles.titleIcon} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}

      {(type === 'workout' || type === 'mental' || type === 'run') && photoUrl && (
        <View style={styles.photoContainer}>
          <Image 
            source={{ uri: photoUrl }} 
            style={styles.activityPhoto}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Run Map Component */}
      {type === 'run' && runData && showMapToOthers && (
        <View style={styles.mapContainer}>
          {mapLoading ? (
            <View style={styles.mapLoadingContainer}>
              <ActivityIndicator size="large" color="#00ffff" />
              <Text style={styles.mapLoadingText}>Loading route...</Text>
            </View>
          ) : showInteractiveMap ? (
            <View style={styles.interactiveMapContainer}>
              <TouchableOpacity 
                style={styles.mapCloseButton}
                onPress={() => setShowInteractiveMap(false)}
              >
                <Ionicons name="close-circle" size={24} color="#fff" />
              </TouchableOpacity>
              {mapRegion && (
                <View style={styles.interactiveMap}>
                  {(() => {
                    try {
                      return (
                <MapView
                  style={styles.interactiveMap}
                  region={mapRegion}
                  provider={PROVIDER_GOOGLE}
                  showsUserLocation={false}
                  showsMyLocationButton={false}
                  showsCompass={true}
                  showsScale={true}
                  scrollEnabled={true}
                  zoomEnabled={true}
                  rotateEnabled={true}
                  pitchEnabled={true}
                          onError={(error) => {
                            console.error('MapView error:', error);
                          }}
                >
                  {parseRunPath(runData.path).length > 1 && (
                    <Polyline
                      coordinates={parseRunPath(runData.path)}
                      strokeColor="#00ffff"
                      strokeWidth={4}
                      lineDashPattern={[1]}
                      zIndex={1}
                      lineCap="round"
                      lineJoin="round"
                      geodesic={true}
                    />
                  )}
                  {parseRunPath(runData.path).length > 0 && (
                    <>
                      <Marker
                        coordinate={parseRunPath(runData.path)[0]}
                        title="Start"
                      >
                        <View style={styles.startMarker} />
                      </Marker>
                      {parseRunPath(runData.path).length > 1 && (
                        <Marker
                          coordinate={parseRunPath(runData.path)[parseRunPath(runData.path).length - 1]}
                          title="End"
                        >
                          <View style={styles.endMarker} />
                        </Marker>
                      )}
                    </>
                  )}
                </MapView>
                      );
                    } catch (error) {
                      console.error('Error rendering MapView:', error);
                      return (
                        <View style={styles.mapPlaceholder}>
                          <Ionicons name="map-outline" size={32} color="#00ffff" />
                          <Text style={styles.mapPlaceholderText}>Map unavailable</Text>
                        </View>
                      );
                    }
                  })()}
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.staticMapContainer}
              onPress={() => setShowInteractiveMap(true)}
              activeOpacity={0.8}
            >
              {staticMapUrl ? (
                <Image 
                  source={{ uri: staticMapUrl }} 
                  style={styles.staticMap}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Ionicons name="map-outline" size={32} color="#00ffff" />
                  <Text style={styles.mapPlaceholderText}>Route Map</Text>
                </View>
              )}
              <View style={styles.mapOverlay}>
                <Ionicons name="expand-outline" size={20} color="#fff" />
                <Text style={styles.mapOverlayText}>Tap to explore</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.statsContainer}>
        {stats?.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <Text style={[styles.statValue, stat.highlight && styles.highlightedStat]}>
              {stat.value}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
      
      {table && targetColumn && (
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={[styles.kudosButton, hasKudoed && styles.kudosButtonActive]} 
            onPress={handleKudos}
            disabled={loading}
          >
            <Ionicons 
              name={hasKudoed ? "heart" : "heart-outline"} 
              size={32}
              color={hasKudoed ? "#ff0055" : "#00ffff"} 
            />
            <Text style={[styles.kudosCount, hasKudoed && styles.kudosCountActive]}>
              {kudosCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.commentsButton}
            onPress={() => router.push({
              pathname: '/(modals)/CommentsScreen',
              params: { activityId: targetId, activityType: type }
            })}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={28} color="#00ffff" />
            <Text style={styles.commentsText}>Comments {commentCount > 0 ? `(${commentCount})` : ''}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#18191b',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222',
  },
  avatarIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  date: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 2,
  },
  editButton: {
    padding: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 19,
  },
  description: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#00ffff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 24,
  },
  kudosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(0,255,255,0.04)',
  },
  kudosButtonActive: {
    backgroundColor: 'rgba(255,0,85,0.04)',
  },
  kudosCount: {
    color: '#00ffff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
  kudosCountActive: {
    color: '#00ffff',
  },
  highlightedStat: {
    color: '#00ffff',
  },
  commentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(0,255,255,0.04)',
    marginLeft: 8,
  },
  commentsText: {
    color: '#00ffff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
  photoContainer: {
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
  },
  activityPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  mapContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapLoadingText: {
    color: '#00ffff',
    fontSize: 16,
    marginTop: 10,
  },
  interactiveMapContainer: {
    position: 'relative',
    height: 300,
  },
  mapCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    padding: 5,
  },
  interactiveMap: {
    height: 300,
  },
  staticMapContainer: {
    position: 'relative',
    flex: 1,
  },
  staticMap: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#18191b',
  },
  mapPlaceholderText: {
    color: '#00ffff',
    fontSize: 18,
    marginTop: 10,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  mapOverlayText: {
    color: '#000',
    fontSize: 14,
    marginTop: 5,
  },
  startMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00ffff',
    borderWidth: 2,
    borderColor: '#fff',
  },
  endMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff0055',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default FeedCard; 