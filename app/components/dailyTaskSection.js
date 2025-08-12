import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Modal, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function DailyTaskSection() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date] = useState(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskType, setNewTaskType] = useState('fitness');
    const [editingTask, setEditingTask] = useState(null);

    // This useMemo hook creates a unique storage key for each day
    // It ensures that tasks are stored separately for each date, allowing daily task management
    const key = useMemo(() => {
        const d = new Date(date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `dailyTasks:${y}-${m}-${dd}`;
    }, [date]);

    // Task class represents individual daily tasks with properties and methods
    class Task {
        constructor(title, type, completed = false, id = null) {
            this.id = id || Date.now() + Math.random(); // Unique identifier for each task
            this.title = title;
            this.completed = completed;
            this.type = type;
            this.createdAt = new Date().toISOString();
            this.completedAt = null;
        }
        
        // Toggle method switches the completion status of a task
        toggle() {
            this.completed = !this.completed;
            this.completedAt = this.completed ? new Date().toISOString() : null;
        }
        
        // toJSON method converts the task to a plain object for storage
        toJSON() {
            return {
                id: this.id,
                title: this.title,
                type: this.type,
                completed: this.completed,
                createdAt: this.createdAt,
                completedAt: this.completedAt,
            };
        }
    }

    // Example tasks that demonstrate the Task class usage
    // These tasks are based on common daily health and fitness goals
    const exampleTasks = [
        // This task is about tracking protein intake for the day.
        // The first argument is the title/description, the second is the type/category, and the third is whether it's completed (default is false).
        new Task("Get 150 grams of protein today", "nutrition"),
        // This task is about hydration.
        new Task("Drink 2000ml of water", "hydration"),
        // This task is about doing a specific workout.
        new Task("Complete a leg workout", "fitness"),
        // This task is about running a certain distance.
        new Task("Run 1 mile", "cardio"),
        // This task is about mental wellness.
        new Task("Practice 10 minutes of meditation", "mental"),
        // This task is about sleep quality.
        new Task("Get 8 hours of sleep", "sleep"),
    ];

    // If you changed the arguments, for example, set the third argument to true, the task would be marked as completed by default.
    // For example: new Task("Run 1 mile", "cardio", true) would mean the task is already done when created.

    // Enhanced TaskAlgorithm class generates personalized tasks based on user preferences
    class TaskAlgorithm {
        constructor(interests, habits, goals, type) {
            this.interests = interests;
            this.habits = habits;
            this.goals = goals;
            this.type = type;
        }
        
        generateTasks() {
            const tasks = [];
            let score = 0; // Fixed: was const score = 0, should be let
            
            // Calculate score based on user preferences
            if (this.interests === this.type) {
                score += 10;
            }
            if (this.habits === this.type) {
                score += 5;
            }
            if (this.goals === this.type) {
                score += 5;
            }
            
            // If score is high enough, create a task
            if (score > 10) {
                tasks.push(new Task(this.type, this.type, true));
            }
            
            // Note: PriorityQueue.sort was incorrect - removed this line
            return tasks;
        }
    }

    // Task type options for the picker
    const taskTypes = [
        { label: 'Fitness', value: 'fitness', icon: 'fitness', color: '#00ff00' },
        { label: 'Nutrition', value: 'nutrition', icon: 'nutrition', color: '#ff6b35' },
        { label: 'Hydration', value: 'hydration', icon: 'water', color: '#00ffff' },
        { label: 'Cardio', value: 'cardio', icon: 'walk', color: '#ff3131' },
        { label: 'Mental', value: 'mental', icon: 'brain', color: '#9d4edd' },
        { label: 'Sleep', value: 'sleep', icon: 'moon', color: '#4a90e2' },
    ];

    // Load tasks from AsyncStorage when component mounts
    useEffect(() => {
        const loadTasks = async () => {
            try {
                setLoading(true);
                const storedTasks = await AsyncStorage.getItem(key);
                if (storedTasks) {
                    // Parse stored tasks and convert them back to Task objects
                    const parsedTasks = JSON.parse(storedTasks).map(taskData => {
                        const task = new Task(taskData.title, taskData.type, taskData.completed, taskData.id);
                        task.createdAt = taskData.createdAt;
                        task.completedAt = taskData.completedAt;
                        return task;
                    });
                    setTasks(parsedTasks);
                } else {
                    // If no stored tasks, use example tasks for the day
                    setTasks(exampleTasks);
                }
            } catch (error) {
                console.error('Error loading tasks:', error);
                // Fallback to example tasks if there's an error
                setTasks(exampleTasks);
            } finally {
                setLoading(false);
            }
        };

        loadTasks();
    }, [key]);

    // Save tasks to AsyncStorage whenever tasks change
    useEffect(() => {
        const saveTasks = async () => {
            try {
                await AsyncStorage.setItem(key, JSON.stringify(tasks));
            } catch (error) {
                console.error('Error saving tasks:', error);
            }
        };

        if (tasks.length > 0) {
            saveTasks();
        }
    }, [tasks, key]);

    // Toggle task completion status
    const toggleTask = (index) => {
        const newTasks = [...tasks];
        newTasks[index].toggle(); // This calls the toggle method on the Task object
        setTasks(newTasks);
    };

    // Add new task
    const addTask = () => {
        if (newTaskTitle.trim()) {
            const newTask = new Task(newTaskTitle.trim(), newTaskType);
            setTasks([...tasks, newTask]);
            setNewTaskTitle('');
            setNewTaskType('fitness');
            setShowAddModal(false);
        }
    };

    // Delete task
    const deleteTask = (index) => {
        Alert.alert(
            'Delete Task',
            'Are you sure you want to delete this task?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        const newTasks = tasks.filter((_, i) => i !== index);
                        setTasks(newTasks);
                    }
                }
            ]
        );
    };

    // Edit task
    const editTask = (index) => {
        const task = tasks[index];
        setEditingTask({ index, title: task.title, type: task.type });
        setNewTaskTitle(task.title);
        setNewTaskType(task.type);
        setShowAddModal(true);
    };

    // Save edited task
    const saveEditedTask = () => {
        if (newTaskTitle.trim() && editingTask) {
            const newTasks = [...tasks];
            newTasks[editingTask.index].title = newTaskTitle.trim();
            newTasks[editingTask.index].type = newTaskType;
            setTasks(newTasks);
            setNewTaskTitle('');
            setNewTaskType('fitness');
            setEditingTask(null);
            setShowAddModal(false);
        }
    };

    // Calculate progress statistics
    const progressStats = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return { total, completed, percentage };
    }, [tasks]);

    // Render individual task item
    const renderTask = ({ item, index }) => (
        <TouchableOpacity
            style={[
                styles.taskItem,
                item.completed && styles.completedTask
            ]}
            onPress={() => toggleTask(index)}
            activeOpacity={0.7}
        >
            <View style={styles.taskContent}>
                <View style={styles.taskHeader}>
                    <Text style={[
                        styles.taskTitle,
                        item.completed && styles.completedTaskTitle
                    ]}>
                        {item.title}
                    </Text>
                    <View style={styles.taskActions}>
                        <TouchableOpacity
                            onPress={() => editTask(index)}
                            style={styles.actionButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="pencil" size={16} color="#888888" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => deleteTask(index)}
                            style={styles.actionButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="trash" size={16} color="#ff4444" />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.taskMeta}>
                    <View style={[styles.taskTypeBadge, { backgroundColor: taskTypes.find(t => t.value === item.type)?.color + '20' }]}>
                        <Ionicons 
                            name={taskTypes.find(t => t.value === item.type)?.icon} 
                            size={14} 
                            color={taskTypes.find(t => t.value === item.type)?.color} 
                        />
                        <Text style={[styles.taskType, { color: taskTypes.find(t => t.value === item.type)?.color }]}>
                            {item.type}
                        </Text>
                    </View>
                    {item.completed && item.completedAt && (
                        <Text style={styles.completedTime}>
                            Completed at {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    )}
                </View>
            </View>
            <View style={[
                styles.checkbox,
                item.completed && styles.checkedBox
            ]}>
                {item.completed && <Text style={styles.checkmark}>✓</Text>}
            </View>
        </TouchableOpacity>
    );

    // Show loading indicator while tasks are being loaded
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00ffff" />
                <Text style={styles.loadingText}>Loading your daily tasks...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.header}>
                <Text style={styles.sectionTitle}>Daily Tasks</Text>
                <Text style={styles.sectionSubtitle}>Complete these tasks to stay on track</Text>
                
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View 
                            style={[
                                styles.progressFill, 
                                { width: `${progressStats.percentage}%` }
                            ]} 
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {progressStats.completed} of {progressStats.total} completed ({progressStats.percentage}%)
                    </Text>
                </View>

                {/* Add Task Button */}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddModal(true)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={24} color="#000000" />
                    <Text style={styles.addButtonText}>Add New Task</Text>
                </TouchableOpacity>
            </View>
            
            {/* Tasks List */}
            {tasks.length > 0 ? (
                <FlatList
                    data={tasks}
                    renderItem={renderTask}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.taskList}
                />
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name="checkmark-circle" size={64} color="#00ffff" />
                    <Text style={styles.emptyStateText}>No tasks for today</Text>
                    <Text style={styles.emptyStateSubtext}>Tasks will appear here based on your goals</Text>
                    <TouchableOpacity
                        style={styles.emptyStateButton}
                        onPress={() => setShowAddModal(true)}
                    >
                        <Text style={styles.emptyStateButtonText}>Create Your First Task</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Add/Edit Task Modal */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingTask ? 'Edit Task' : 'Add New Task'}
                        </Text>
                        
                        <TextInput
                            style={styles.input}
                            placeholder="Enter task title..."
                            placeholderTextColor="#888888"
                            value={newTaskTitle}
                            onChangeText={setNewTaskTitle}
                            autoFocus={true}
                        />

                        <Text style={styles.inputLabel}>Task Type:</Text>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.typeSelector}
                        >
                            {taskTypes.map((type) => (
                                <TouchableOpacity
                                    key={type.value}
                                    style={[
                                        styles.typeOption,
                                        newTaskType === type.value && styles.selectedTypeOption
                                    ]}
                                    onPress={() => setNewTaskType(type.value)}
                                >
                                    <Ionicons 
                                        name={type.icon} 
                                        size={20} 
                                        color={newTaskType === type.value ? '#000000' : type.color} 
                                    />
                                    <Text style={[
                                        styles.typeOptionText,
                                        newTaskType === type.value && styles.selectedTypeOptionText
                                    ]}>
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setShowAddModal(false);
                                    setNewTaskTitle('');
                                    setNewTaskType('fitness');
                                    setEditingTask(null);
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={editingTask ? saveEditedTask : addTask}
                            >
                                <Text style={styles.saveButtonText}>
                                    {editingTask ? 'Save Changes' : 'Add Task'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Styles following BetterU design guidelines with cyan (#00ffff) and black (#000000) theme
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        padding: 20,
    },
    header: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#00ffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    sectionSubtitle: {
        fontSize: 16,
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 20,
        opacity: 0.8,
    },
    progressContainer: {
        marginBottom: 20,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#333333',
        borderRadius: 4,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#00ffff',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        color: '#ffffff',
        textAlign: 'center',
        opacity: 0.8,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00ffff',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignSelf: 'center',
    },
    addButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    taskList: {
        paddingBottom: 20,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111111',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#333333',
    },
    completedTask: {
        backgroundColor: '#0a0a0a',
        borderColor: '#00ffff',
        opacity: 0.8,
    },
    taskContent: {
        flex: 1,
        marginRight: 16,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    taskTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
        flex: 1,
        marginRight: 8,
    },
    completedTaskTitle: {
        color: '#00ffff',
        textDecorationLine: 'line-through',
    },
    taskActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 4,
        marginLeft: 8,
    },
    taskMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    taskTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
    },
    taskType: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
        textTransform: 'capitalize',
    },
    completedTime: {
        fontSize: 11,
        color: '#00ffff',
        opacity: 0.8,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#00ffff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkedBox: {
        backgroundColor: '#00ffff',
        borderColor: '#00ffff',
    },
    checkmark: {
        color: '#000000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
    },
    loadingText: {
        color: '#00ffff',
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 16,
        color: '#888888',
        textAlign: 'center',
        opacity: 0.8,
        marginBottom: 24,
    },
    emptyStateButton: {
        backgroundColor: '#00ffff',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
    },
    emptyStateButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#111111',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 2,
        borderColor: '#00ffff',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00ffff',
        textAlign: 'center',
        marginBottom: 24,
    },
    input: {
        backgroundColor: '#222222',
        borderWidth: 2,
        borderColor: '#333333',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        color: '#ffffff',
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 12,
    },
    typeSelector: {
        paddingBottom: 20,
    },
    typeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#222222',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#333333',
    },
    selectedTypeOption: {
        backgroundColor: '#00ffff',
        borderColor: '#00ffff',
    },
    typeOptionText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
    selectedTypeOptionText: {
        color: '#000000',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    cancelButton: {
        backgroundColor: '#333333',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        marginRight: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#00ffff',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        marginLeft: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '600',
    },
});


