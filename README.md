# BetterU - AI-Powered Fitness App

A comprehensive React Native/Expo fitness application with AI-powered features, social networking, and advanced tracking capabilities.

## 🚀 Features

### Core Fitness Features
- **Workout Tracking**: Log and track workouts with detailed exercise data
- **Mental Health Sessions**: Meditation and mindfulness tracking
- **Run Tracking**: GPS-based run tracking with route visualization
- **PR Tracking**: Personal record management and progress visualization
- **Calorie & Nutrition Tracking**: AI-powered food detection and macro tracking
- **Water & Protein Tracking**: Comprehensive hydration and protein monitoring

### AI-Powered Features
- **AI Food Detection**: Take photos of food to automatically detect calories and macros
- **AI Meal Generator**: Generate meal plans based on dietary preferences
- **AI Trainer**: Personalized workout recommendations and guidance
- **Smart Recommendations**: AI-driven challenge and content recommendations

### Social Features
- **Community Feed**: Share workouts, achievements, and progress
- **Friend System**: Add friends, view profiles, and track mutual progress
- **Groups**: Create and join fitness groups with leaderboards
- **Challenges**: Participate in fitness challenges with rewards
- **Activity Sharing**: Share runs, workouts, and achievements

### Premium Features
- **Premium Subscription**: Unlock advanced features and AI capabilities
- **Enhanced Analytics**: Detailed progress reports and insights
- **Priority Support**: Premium user support and features

## 🛠 Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL + Real-time subscriptions)
- **AI**: OpenAI GPT-4 Vision API for food detection
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage for media files
- **Maps**: React Native Maps for run tracking
- **State Management**: React Context API
- **UI Components**: Custom components with consistent design system

## 📱 App Structure

```
app/
├── (auth)/           # Authentication screens
├── (tabs)/           # Main tab navigation
├── (modals)/         # Modal screens
├── components/       # Reusable UI components
├── group/           # Group-related screens
├── profile/         # Profile screens
└── utils/           # Utility functions

components/           # Shared components
├── ChallengeCard.js
├── ChallengeSection.js
├── FeedCard.js
└── ...

context/              # React Context providers
├── AuthContext.js
├── UserContext.js
├── TrackingContext.js
└── ...

utils/               # Utility functions
├── aiFoodDetection.js
├── challengeRecommendationEngine.js
├── usageTracker.js
└── ...
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI
- Supabase account
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Borgatlat/betteruaiGroup.git
   cd BetterUJuly31
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
   EXPO_PUBLIC_AI_DAILY_LIMIT=50
   EXPO_PUBLIC_AI_HOURLY_LIMIT=10
   EXPO_PUBLIC_AI_RATE_LIMIT_ENABLED=true
   EXPO_PUBLIC_AI_TIMEOUT_MS=30000
   EXPO_PUBLIC_AI_MAX_RETRIES=3
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the migration files in `supabase/migrations/`
   - Update the Supabase configuration in `lib/supabase.js`

5. **Start the development server**
   ```bash
   npx expo start
   ```

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Run the SQL migrations in `supabase/migrations/`
3. Set up Row Level Security (RLS) policies
4. Configure authentication providers
5. Set up storage buckets for media files

### OpenAI API Setup
1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. Add the key to your `.env` file
3. Configure usage limits as needed

## 📊 Database Schema

The app uses a comprehensive database schema with tables for:
- Users and profiles
- Workouts and exercises
- Mental health sessions
- Runs and routes
- Social features (friends, groups, challenges)
- Tracking data (calories, water, protein)
- Premium subscriptions

## 🎨 Design System

The app uses a consistent design system with:
- **Primary Colors**: Cyan (#00ffff), Red (#ff0055), Neon Green (#00ff00)
- **Typography**: Clean, modern fonts with proper hierarchy
- **Components**: Reusable UI components with consistent styling
- **Animations**: Smooth transitions and micro-interactions

## 🔒 Security Features

- **API Key Protection**: Environment variables for sensitive data
- **Usage Limits**: Rate limiting for AI features
- **Row Level Security**: Database-level security policies
- **Input Validation**: Comprehensive input sanitization
- **Error Handling**: Graceful error handling and user feedback

## 🚀 Deployment

### Expo Build
```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### App Store Deployment
1. Configure EAS Build settings in `eas.json`
2. Set up app store credentials
3. Submit builds to App Store Connect

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- Supabase for backend services
- Expo for the development platform
- React Native community for tools and libraries

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Contact the development team

---

**Note**: This app requires proper API keys and Supabase configuration to function. Make sure to set up all required services before running the application.
