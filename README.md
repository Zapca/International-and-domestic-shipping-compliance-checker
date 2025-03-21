# LogiTrack Compliance Platform

A specialized logistics compliance verification platform with multiple authentication methods (Google, Email, Phone) and AI-powered compliance checking tools built with React, TypeScript, and Material UI.

## Features

- **Multiple Authentication Methods**:
  - Email/Password Authentication
  - Google Authentication
  - Phone Number Authentication with OTP verification

- **Compliance Checker**:
  - Image Upload: Upload shipping documents for compliance verification
    - **Gemini Flash Vision AI**: Advanced image analysis for automatic extraction of text, dimensions, weight, and package characteristics
    - Automatic identification of package type, dimensions, and condition
    - Real-time confidence scoring of extracted data
    - Powered by Google's Gemini 2.0 Flash Thinking model
  - CSV Upload: Check compliance of bulk data via CSV files
  - Manual Entry: Enter data manually for quick compliance checks
  - Detailed compliance reports with status indicators

- **Responsive Design**:
  - Mobile-friendly interface
  - Adapts to different screen sizes

- **User Dashboard**:
  - Track shipments
  - View shipment history
  - Manage account settings
  - Receive notifications

- **Modern UI**:
  - Material Design components
  - Clean and professional interface
  - Intuitive navigation

## Technologies Used

- **Frontend**:
  - React 19
  - TypeScript
  - Material UI
  - React Router

- **Authentication**:
  - Firebase Authentication

- **AI and Machine Learning**:
  - Gemini Flash Vision integration for image analysis and data extraction
  - Text recognition for shipping labels and documents
  - Object detection for parcels and packaging

## Gemini Vision AI Integration

This application uses Google's Gemini 2.0 Flash Thinking model for advanced image analysis:

- **Model**: `gemini-2.0-flash-thinking-exp-01-21`
- **Features**:
  - Real-time document analysis
  - Extraction of key fields like tracking numbers, dates, dimensions
  - Package type and condition assessment
  - High confidence scoring of extracted data

The Gemini Vision integration allows users to simply upload an image of a shipping document or package, and the system automatically extracts relevant information for compliance checking. The confidence score helps users understand the reliability of the extracted data.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/logitrack.git
   cd logitrack
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication methods (Email/Password, Google, Phone)
   - Copy your Firebase configuration to `src/config/firebase.ts`

4. Start the development server:
   ```
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.

## Project Structure

```
src/
├── components/
│   ├── auth/           # Authentication components
│   ├── common/         # Reusable components
│   └── layout/         # Layout components
├── config/             # Configuration files
├── context/            # Context providers
├── pages/              # Page components
├── services/           # Service functions
└── styles/             # Global styles
```

## Firebase Configuration

To use authentication features, you need to update the Firebase configuration in `src/config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

## Using the Compliance Checker

The Compliance Checker tool allows you to verify your logistics data for compliance with regulations and standards. You can use it in three ways:

1. **Image Upload with AI Analysis**: 
   - Upload images of shipping documents, invoices, or parcels
   - The integrated Gemini Flash Vision AI automatically extracts:
     - Text content from shipping labels and documents
     - Physical characteristics of parcels (dimensions, weight estimates)
     - Package type and condition assessment
   - View confidence scores for extracted data
   - Review and verify extracted information before compliance checking
   - Toggle AI analysis on/off as needed

2. **CSV Upload**: Upload a CSV file containing your logistics data for bulk compliance checking.

3. **Manual Entry**: Enter your logistics data manually for quick compliance checks. Use a format like:
   ```
   name: John Doe, address: 123 Main St, phone: 555-1234
   ```

After submitting your data, you'll receive a detailed compliance report showing which fields are compliant, which have warnings, and which are non-compliant with relevant regulations.

## Available Scripts

In the project directory, you can run:

- `npm start`: Runs the app in development mode
- `npm test`: Launches the test runner
- `npm run build`: Builds the app for production
- `npm run eject`: Ejects the create-react-app configuration

## License

This project is licensed under the GNU GENERAL PUBLIC LICENSE - see the LICENSE file for details.

## Acknowledgments

- [Create React App](https://create-react-app.dev/)
- [Material UI](https://mui.com/)
- [Firebase](https://firebase.google.com/)
- [React Router](https://reactrouter.com/)
- [Google Gemini AI](https://deepmind.google/technologies/gemini/)
