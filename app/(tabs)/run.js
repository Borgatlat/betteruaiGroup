import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, SafeAreaView, Dimensions, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';


const { width, height } = Dimensions.get('window');


const RunScreen = () => {
 const [region, setRegion] = useState({
   latitude: 37.78825,
   longitude: -122.4324,
   latitudeDelta: 0.01,
   longitudeDelta: 0.01,
 });
 const [locations, setLocations] = useState([]);
 const [lastLocation, setLastLocation] = useState(null);
 const [distance, setDistance] = useState(0);
 const [rawDistance, setRawDistance] = useState(0); // Distance in meters
 const [currentPace, setCurrentPace] = useState(0);
 const [averagePace, setAveragePace] = useState(0);
 const [elapsed, setElapsed] = useState(0);
 const [startLocation, setStartLocation] = useState(null);
 const [recording, setRecording] = useState(false);
 const [paused, setPaused] = useState(false);
 const [runStarted, setRunStarted] = useState(false);
 const [autoZoom, setAutoZoom] = useState(true);
 const [useMiles, setUseMiles] = useState(false);
 const [startTime, setStartTime] = useState(null);
 const [pauseTime, setPauseTime] = useState(0);
 const [totalPauseTime, setTotalPauseTime] = useState(0);
 const locationWatcher = useRef(null);
 const mapRef = useRef(null);
 const timerRef = useRef(null);
 const locationsRef = useRef([]);
 const lastValidLocation = useRef(null);
 const MIN_DISTANCE = 1; // Minimum distance in meters between points
 const SMOOTHING_FACTOR = 0.5; // Increased smoothing factor
 const { user } = useUser();
 const router = useRouter();


 useEffect(() => {
   (async () => {
     let { status } = await Location.requestForegroundPermissionsAsync();
     if (status !== 'granted') {
       Alert.alert('Location permission required', 'Please enable location services to track your runs.');
       return;
     }
     let location = await Location.getCurrentPositionAsync({
       accuracy: Location.Accuracy.High
     });
     setRegion({
       latitude: location.coords.latitude,
       longitude: location.coords.longitude,
       latitudeDelta: 0.01,
       longitudeDelta: 0.01,
     });
   })();
   return () => {
     if (locationWatcher.current) {
       locationWatcher.current.remove();
     }
     if (timerRef.current) {
       clearInterval(timerRef.current);
     }
   };
 }, []);


 useEffect(() => {
   if (recording && !paused) {
     if (!timerRef.current) {
       const startTimeStamp = startTime || Date.now();
       setStartTime(startTimeStamp);
     }
    
     timerRef.current = setInterval(() => {
       const currentElapsed = Math.max(0, Date.now() - startTime - totalPauseTime);
       setElapsed(currentElapsed);
       
       // Calculate average pace only (let GPS handle current pace)
       if (distance > 0 && currentElapsed > 0) {
         const elapsedMinutes = currentElapsed / 1000 / 60;
         
         // Average pace uses entire run duration
         const avgPace = elapsedMinutes / distance;
         setAveragePace(avgPace);
         
         // Debug logging
         console.log('Timer Average Pace Debug:', {
           elapsedMinutes,
           distance,
           avgPace
         });
       }
     }, 1000);
   } else {
     if (timerRef.current) {
       clearInterval(timerRef.current);
       timerRef.current = null;
     }
   }
   return () => {
     if (timerRef.current) {
       clearInterval(timerRef.current);
     }
   };
 }, [recording, paused, totalPauseTime, distance, useMiles, startTime]);

 // Handle unit switching
 useEffect(() => {
   if (rawDistance > 0 && elapsed > 0) {
     const elapsedMinutes = elapsed / 1000 / 60;
     
     // Convert raw distance to current unit
     const convertedDistance = useMiles ? rawDistance / 1609.34 : rawDistance / 1000;
     setDistance(convertedDistance);
     
     // Update average pace using entire run duration
     if (elapsedMinutes > 0 && convertedDistance > 0) {
       const avgPace = elapsedMinutes / convertedDistance; // Use total time and distance
       setAveragePace(avgPace);
     }
   }
 }, [useMiles, rawDistance, elapsed]);

 // Recalculate current pace when units change
 useEffect(() => {
   if (locations.length >= 2 && elapsed > 0) {
     const elapsedMinutes = elapsed / 1000 / 60;
     
     // Find GPS points from the last 10 seconds
     const tenSecondsAgo = Date.now() - 10000; // 10 seconds ago
     const recentPoints = locations.filter(location => {
       // Estimate time based on position in array (assuming ~1-2 seconds between points)
       const pointIndex = locations.indexOf(location);
       const estimatedTime = Date.now() - (locations.length - pointIndex) * 1500; // 1.5 seconds per point
       return estimatedTime > tenSecondsAgo;
     });
     
     if (recentPoints.length >= 2) {
       // Calculate distance in last 10 seconds
       let recentDistance = 0;
       for (let i = 1; i < recentPoints.length; i++) {
         recentDistance += getDistance(recentPoints[i-1], recentPoints[i]);
       }
       
       // Convert to current units
       const recentDistanceInUnits = useMiles ? recentDistance / 1609.34 : recentDistance / 1000;
       
       if (recentDistanceInUnits > 0) {
         // Current pace = distance in last 10 seconds / 10 seconds
         const tenSecondsInMinutes = 10 / 60; // 10 seconds = 0.167 minutes
         const currentPaceValue = tenSecondsInMinutes / recentDistanceInUnits;
         setCurrentPace(currentPaceValue);
       }
     }
   }
 }, [useMiles, locations, elapsed]);


 const getDistance = (point1, point2) => {
   if (!point1 || !point2) return 0;
   
   const R = 6371e3; // Earth's radius in meters
   const φ1 = point1.latitude * Math.PI/180;
   const φ2 = point2.latitude * Math.PI/180;
   const Δφ = (point2.latitude - point1.latitude) * Math.PI/180;
   const Δλ = (point2.longitude - point1.longitude) * Math.PI/180;

   const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
           Math.cos(φ1) * Math.cos(φ2) *
           Math.sin(Δλ/2) * Math.sin(Δλ/2);
   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
   return R * c;
 };


 const isLocationValid = (location) => {
   if (!location) return false;
   if (!lastValidLocation.current) return true;
   
   const distance = getDistance(lastValidLocation.current, location);
   const accuracy = location.accuracy || 0;
   
   return distance >= MIN_DISTANCE && accuracy < 30;
 };


 const startRun = async () => {
   setRecording(true);
   setPaused(false);
   setRunStarted(true);
   setLocations([]);
   locationsRef.current = [];
   setElapsed(0);
   setDistance(0);
   setRawDistance(0);
   setCurrentPace(0);
   setAveragePace(0);
   setLastLocation(null);
   lastValidLocation.current = null;
   setTotalPauseTime(0);
   setPauseTime(0);
   const now = Date.now();
   setStartTime(now);
   
   // Get initial location for start marker
   const initialLocation = await Location.getCurrentPositionAsync({
     accuracy: Location.Accuracy.BestForNavigation
   });
   console.log('Initial location:', initialLocation.coords);
   setStartLocation(initialLocation.coords);
   setLocations([initialLocation.coords]);
   locationsRef.current = [initialLocation.coords];
   lastValidLocation.current = initialLocation.coords;
   setLastLocation(initialLocation.coords);
  
   // Start location tracking
   startLocationTracking(false); // Pass false explicitly for new run
 };

 const pauseRun = () => {
   if (recording && !paused) {
     console.log('Pausing run...');
     setPaused(true);
     setPauseTime(Date.now());
     // Stop location tracking when paused
     if (locationWatcher.current) {
       locationWatcher.current.remove();
       locationWatcher.current = null;
       console.log('GPS tracking stopped');
     }
     // Clear the timer but don't reset startTime
     if (timerRef.current) {
       clearInterval(timerRef.current);
       timerRef.current = null;
       console.log('Timer stopped');
     }
   } else if (recording && paused) {
     console.log('Resuming run...');
     const pauseDuration = Date.now() - pauseTime;
     setTotalPauseTime(prev => prev + pauseDuration);
     console.log('Pause duration:', pauseDuration, 'ms');
     
     // Set paused to false first, then restart tracking
     setPaused(false);
     
     // Restart location tracking when resumed with paused=false parameter
     setTimeout(() => {
       console.log('Starting location tracking...');
       startLocationTracking(false); // Pass false explicitly
     }, 500); // Longer delay to ensure state is updated
   }
 };

 const startLocationTracking = async (isPaused = paused) => {
   console.log('startLocationTracking called, paused:', isPaused);
   if (locationWatcher.current) {
     locationWatcher.current.remove();
     console.log('Removed existing location watcher');
   }
   
   locationWatcher.current = await Location.watchPositionAsync(
     {
       accuracy: Location.Accuracy.BestForNavigation,
       distanceInterval: 1,
       timeInterval: 1000
     },
     (location) => {
       if (isPaused) {
         console.log('Location update ignored - run is paused');
         return; // Don't process location updates when paused
       }
       
       const newLocation = location.coords;
       console.log('New location received:', newLocation);
       
       if (isLocationValid(newLocation)) {
         console.log('Location is valid, adding to trail');
         lastValidLocation.current = newLocation;
         
         // Update locations using the ref
         const updatedLocations = [...locationsRef.current, newLocation];
         locationsRef.current = updatedLocations;
         setLocations(updatedLocations);
         
         // Calculate total distance
         let totalDistance = 0;
         for (let i = 1; i < updatedLocations.length; i++) {
           const segmentDistance = getDistance(updatedLocations[i-1], updatedLocations[i]);
           totalDistance += segmentDistance;
         }
         console.log('New total distance calculated:', totalDistance);
         
         // Store raw distance in meters
         setRawDistance(totalDistance);
         
         // Convert to miles if needed and update distance state
         const finalDistance = useMiles ? totalDistance / 1609.34 : totalDistance / 1000;
         console.log('Setting distance to:', finalDistance);
         setDistance(finalDistance);
         
         setLastLocation(newLocation);
         
         // Update current pace (only when not paused)
         if (!isPaused) {
           const elapsedMinutes = elapsed / 1000 / 60; // Use elapsed state directly
           
           // Calculate current pace using last 10 seconds of movement
           let currentPaceValue;
           
           if (updatedLocations.length >= 2) {
             // Find GPS points from the last 10 seconds
             const tenSecondsAgo = Date.now() - 10000; // 10 seconds ago
             const recentPoints = updatedLocations.filter(location => {
               // Estimate time based on position in array (assuming ~1-2 seconds between points)
               const pointIndex = updatedLocations.indexOf(location);
               const estimatedTime = Date.now() - (updatedLocations.length - pointIndex) * 1500; // 1.5 seconds per point
               return estimatedTime > tenSecondsAgo;
             });
             
             if (recentPoints.length >= 2) {
               // Calculate distance in last 10 seconds
               let recentDistance = 0;
               for (let i = 1; i < recentPoints.length; i++) {
                 recentDistance += getDistance(recentPoints[i-1], recentPoints[i]);
               }
               
               // Convert to current units
               const recentDistanceInUnits = useMiles ? recentDistance / 1609.34 : recentDistance / 1000;
               
               if (recentDistanceInUnits > 0) {
                 // Current pace = distance in last 10 seconds / 10 seconds
                 const tenSecondsInMinutes = 10 / 60; // 10 seconds = 0.167 minutes
                 currentPaceValue = tenSecondsInMinutes / recentDistanceInUnits;
               } else {
                 // No recent movement, use fallback
                 currentPaceValue = elapsedMinutes / (finalDistance * 0.8);
               }
             } else {
               // Not enough recent points, use fallback
               currentPaceValue = elapsedMinutes / (finalDistance * 0.7);
             }
           } else {
             // Not enough GPS points, use fallback
             currentPaceValue = elapsedMinutes / (finalDistance * 0.6);
           }
           
           setCurrentPace(currentPaceValue);
           
           // Update average pace using entire run duration
           const avgPace = elapsedMinutes / finalDistance; // Use total time and distance
           setAveragePace(avgPace);
           
           // Debug logging
           console.log('GPS Pace Debug:', {
             elapsedMinutes,
             finalDistance,
             recentDistanceInUnits: updatedLocations.length >= 2 ? (useMiles ? (() => {
               const tenSecondsAgo = Date.now() - 10000;
               const recentPoints = updatedLocations.filter(location => {
                 const pointIndex = updatedLocations.indexOf(location);
                 const estimatedTime = Date.now() - (updatedLocations.length - pointIndex) * 1500;
                 return estimatedTime > tenSecondsAgo;
               });
               if (recentPoints.length >= 2) {
                 let recentDistance = 0;
                 for (let i = 1; i < recentPoints.length; i++) {
                   recentDistance += getDistance(recentPoints[i-1], recentPoints[i]);
                 }
                 return recentDistance / 1609.34;
               }
               return 0;
             })() : (() => {
               const tenSecondsAgo = Date.now() - 10000;
               const recentPoints = updatedLocations.filter(location => {
                 const pointIndex = updatedLocations.indexOf(location);
                 const estimatedTime = Date.now() - (updatedLocations.length - pointIndex) * 1500;
                 return estimatedTime > tenSecondsAgo;
               });
               if (recentPoints.length >= 2) {
                 let recentDistance = 0;
                 for (let i = 1; i < recentPoints.length; i++) {
                   recentDistance += getDistance(recentPoints[i-1], recentPoints[i]);
                 }
                 return recentDistance / 1000;
               }
               return 0;
             })()) : 0,
             currentPaceValue,
             avgPace,
             gpsPoints: updatedLocations.length
           });
         }
       } else {
         console.log('Location rejected - too close or inaccurate');
       }
     }
   );
   console.log('Location watcher started');
 };


 const stopRun = async () => {
   setRecording(false);
   if (locationWatcher.current) {
     locationWatcher.current.remove();
   }
   if (timerRef.current) {
     clearInterval(timerRef.current);
   }
  
   router.push({
     pathname: '/(modals)/run-summary',
     params: {
       locations: JSON.stringify(locations),
       distance: distance.toString(),
       duration: (elapsed / 1000).toString(),
       pace: averagePace.toString(),
       unit: useMiles ? 'miles' : 'km',
       startTime: startTime.toString(),
       endTime: Date.now().toString()
     }
   });
 };


 const formatTime = (ms) => {
   if (ms < 0) ms = 0; // Prevent negative time
   const seconds = Math.floor(ms / 1000);
   const minutes = Math.floor(seconds / 60);
   const hours = Math.floor(minutes / 60);
   
   if (hours > 0) {
     // Show hours only when run is over an hour
     return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
   } else {
     // Show only minutes and seconds for runs under an hour
     return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
   }
 };


 const formatPace = (pace) => {
   if (pace === 0) return '--:--';
   const minutes = Math.floor(pace);
   const seconds = Math.floor((pace - minutes) * 60);
   return `${minutes}:${seconds.toString().padStart(2, '0')}`;
 };


 const formatDistance = (meters) => {
   const value = useMiles ? meters / 1609.34 : meters / 1000;
   return value.toFixed(2);
 };


 useEffect(() => {
   if (mapRef.current && locations.length > 1 && autoZoom) {
     mapRef.current.fitToCoordinates(locations, {
       edgePadding: { top: 50, right: 50, bottom: 300, left: 50 }, // Leave bottom space for controls
       animated: true,
     });
   }
 }, [locations, autoZoom]);


 return (
   <SafeAreaView style={styles.container}>
     <MapView
       ref={mapRef}
       style={styles.map}
       region={region}
       showsUserLocation={true}
       followsUserLocation={false}
       provider={Platform.OS === 'ios' ? undefined : PROVIDER_GOOGLE}
       showsMyLocationButton={false}
       showsCompass={true}
       showsScale={true}
       onError={(error) => {
         console.error('Map error:', error);
         Alert.alert(
           'Map Error',
           'There was an error loading the map. Please check your location permissions and try again.'
         );
       }}
     >
       {locations.length > 1 && (
         <Polyline
           coordinates={locations}
           strokeColor="#00ffff"
           strokeWidth={4}
           lineDashPattern={[1]}
           zIndex={1}
           lineCap="round"
           lineJoin="round"
           geodesic={true}
         />
       )}
       {startLocation && (
         <Marker
           coordinate={startLocation}
           title="Start"
         >
           <View style={styles.startMarker} />
         </Marker>
       )}
       {locations.length > 1 && (
         <Marker
           coordinate={locations[locations.length - 1]}
           title="End"
         >
           <View style={styles.currentMarker} />
         </Marker>
       )}
     </MapView>
    
     <View style={styles.overlay}>
       <View style={styles.controlsContainer}>
         <View style={styles.unitToggle}>
           <Text style={styles.unitText}>KM</Text>
           <Switch
             value={useMiles}
             onValueChange={setUseMiles}
             trackColor={{ false: '#767577', true: '#00ffff' }}
             thumbColor={useMiles ? '#00ffff' : '#f4f3f4'}
           />
           <Text style={styles.unitText}>MI</Text>
         </View>
         <View style={styles.autoZoomToggle}>
           <Text style={styles.unitText}>Auto Zoom</Text>
           <Switch
             value={autoZoom}
             onValueChange={setAutoZoom}
             trackColor={{ false: '#767577', true: '#00ffff' }}
             thumbColor={autoZoom ? '#00ffff' : '#f4f3f4'}
           />
         </View>
         <TouchableOpacity 
           style={styles.runLogButton}
           onPress={() => router.push('/run-log')}
         >
           <Ionicons name="list-outline" size={20} color="#00ffff" />
         </TouchableOpacity>
       </View>

       <View style={styles.statsContainer}>
         <View style={styles.statBox}>
           <Text style={styles.statLabel}>Distance</Text>
           <Text style={styles.statValue}>
             {distance.toFixed(2)} {useMiles ? 'mi' : 'km'}
           </Text>
         </View>
         <View style={styles.statBox}>
           <Text style={styles.statLabel}>Avg Pace</Text>
           <Text style={styles.statValue}>
             {averagePace > 0 ? `${formatPace(averagePace)} /${useMiles ? 'mi' : 'km'}` : '--:--'}
           </Text>
         </View>
         <View style={styles.statBox}>
           <Text style={styles.statLabel}>Current Pace</Text>
           <Text style={styles.statValue}>
             {currentPace > 0 ? `${formatPace(currentPace)} /${useMiles ? 'mi' : 'km'}` : '--:--'}
           </Text>
         </View>
         <View style={styles.statBox}>
           <Text style={styles.statLabel}>Time</Text>
           <Text style={styles.statValue}>
             {formatTime(elapsed)}
           </Text>
         </View>
       </View>
      
       <View style={styles.actionButtonsContainer}>
         {recording && (
           <TouchableOpacity
             style={[styles.actionButton, styles.pauseButton, paused && styles.resumeButton]}
             onPress={pauseRun}
           >
             <LinearGradient
               colors={paused ? ['#ff9800', '#f57c00'] : ['#2196f3', '#1976d2']}
               style={styles.gradient}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 0 }}
             >
               <Ionicons name={paused ? "play" : "pause"} size={24} color="#fff" />
               <Text style={styles.buttonText}>{paused ? "Resume" : "Pause"}</Text>
             </LinearGradient>
           </TouchableOpacity>
         )}
         
         {recording && !paused && (
           <TouchableOpacity
             style={[styles.actionButton, styles.stopButton]}
             onPress={stopRun}
           >
             <LinearGradient
               colors={['#ff4444', '#cc0000']}
               style={styles.gradient}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 0 }}
             >
               <Ionicons name="stop" size={32} color="#fff" />
               <Text style={styles.buttonText}>End Run</Text>
             </LinearGradient>
           </TouchableOpacity>
         )}
         
         {!recording && (
           <TouchableOpacity
             style={[styles.actionButton, styles.startButton]}
             onPress={startRun}
           >
             <LinearGradient
               colors={['#00c853', '#009624']}
               style={styles.gradient}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 0 }}
             >
               <Ionicons name="play" size={32} color="#fff" />
               <Text style={styles.buttonText}>Start Run</Text>
             </LinearGradient>
           </TouchableOpacity>
         )}
       </View>
     </View>
   </SafeAreaView>
 );
};


const styles = StyleSheet.create({
 container: {
   flex: 1,
   backgroundColor: '#111',
 },
 map: {
   width: width,
   height: height,
 },
 overlay: {
   position: 'absolute',
   bottom: Platform.OS === 'ios' ? 80 : 70,
   left: 0,
   right: 0,
   backgroundColor: 'rgba(0, 0, 0, 0.9)',
   padding: 20,
   borderTopLeftRadius: 20,
   borderTopRightRadius: 20,
   shadowColor: '#000',
   shadowOffset: {
     width: 0,
     height: -2,
   },
   shadowOpacity: 0.25,
   shadowRadius: 3.84,
   elevation: 5,
 },
 controlsContainer: {
   flexDirection: 'row',
   alignItems: 'center',
   justifyContent: 'space-between',
   marginBottom: 15,
   backgroundColor: 'rgba(255, 255, 255, 0.1)',
   padding: 10,
   borderRadius: 10,
 },
 unitToggle: {
   flexDirection: 'row',
   alignItems: 'center',
   justifyContent: 'center',
 },
 autoZoomToggle: {
   flexDirection: 'row',
   alignItems: 'center',
   justifyContent: 'center',
 },
 runLogButton: {
   padding: 8,
   borderRadius: 8,
   backgroundColor: 'rgba(0, 255, 255, 0.1)',
 },
 unitText: {
   color: '#fff',
   fontSize: 14,
   marginHorizontal: 10,
 },
 statsContainer: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   marginBottom: 20,
   backgroundColor: 'rgba(255, 255, 255, 0.1)',
   padding: 15,
   borderRadius: 10,
 },
 statBox: {
   alignItems: 'center',
   flex: 1,
 },
 statLabel: {
   color: '#fff',
   fontSize: 12,
   marginBottom: 5,
 },
 statValue: {
   color: '#00ffff',
   fontSize: 18,
   fontWeight: 'bold',
 },
 actionButtonsContainer: {
   flexDirection: 'row',
   justifyContent: 'space-between',
   marginTop: 10,
   gap: 10,
 },
 actionButton: {
   flex: 1,
   height: 60,
   borderRadius: 30,
   overflow: 'hidden',
 },
 startButton: {
   backgroundColor: '#00c853',
 },
 stopButton: {
   backgroundColor: '#d50000',
 },
 pauseButton: {
   backgroundColor: '#2196f3',
 },
 resumeButton: {
   backgroundColor: '#ff9800',
 },
 gradient: {
   flex: 1,
   flexDirection: 'row',
   alignItems: 'center',
   justifyContent: 'center',
   padding: 10,
 },
 buttonText: {
   color: '#fff',
   fontSize: 18,
   fontWeight: 'bold',
   marginLeft: 10,
 },
 startMarker: {
   width: 20,
   height: 20,
   borderRadius: 10,
   backgroundColor: '#00ff00',
   borderWidth: 2,
   borderColor: '#fff',
 },
 currentMarker: {
   width: 20,
   height: 20,
   borderRadius: 10,
   backgroundColor: '#ff0000',
   borderWidth: 2,
   borderColor: '#fff',
 },
});


export const screenOptions = { headerShown: false };
export default RunScreen;