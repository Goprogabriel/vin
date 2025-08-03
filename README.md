# VinNoget - Vinscannings App

Denne app giver anbefalinger til vin baseret på billeder af brugerens vinreol og måltidsinformation.

## Firebase Setup

For at sætte appen korrekt op med Firebase og OpenAI, følg disse trin:

### 1. Firebase CLI Installation

Installer Firebase CLI hvis du ikke allerede har det:

```
npm install -g firebase-tools
```

### 2. Login til Firebase

```
firebase login
```

### 3. Initialisér projektet

```
cd /path/to/vinNoget
firebase init
```

Vælg følgende funktioner:
- Firestore
- Functions
- Storage

### 4. Konfigurér OpenAI API nøgle

Sæt din OpenAI API nøgle som en environment variable i Firebase Functions:

```
firebase functions:config:set openai.key="din-openai-api-nøgle-her"
```

### 5. Deploy Firebase Functions

```
firebase deploy --only functions
```

### 6. Firestore Collections Setup

Opret følgende collections i Firebase Firestore:

- **users**: Brugere med credits
  - `uid`: string (bruger ID fra Authentication)
  - `credits`: number (antal credits)
  - `createdAt`: timestamp

- **meals**: Gemte måltider
  - `userId`: string
  - `createdAt`: timestamp
  - Plus felter for hvert "course" med detaljer

- **recommendationRequests**: Anmodninger om vinanbefalinger
  - `userId`: string
  - `mealData`: map (måltidsdetaljer)
  - `imageUrls`: array (billeder af vinreol)
  - `recommendationType`: string ('simple', 'standard', 'detailed')
  - `credits`: number (antal credits brugt)
  - `status`: string ('pending', 'completed', 'error')
  - `createdAt`: timestamp
  - `completedAt`: timestamp (optional)
  - `recommendationId`: string (reference til recommendation)
  - `error`: string (optional fejlbesked)

- **recommendations**: Færdige vinanbefalinger
  - `userId`: string
  - `mealData`: map (måltidsdetaljer)
  - `wines`: array (anbefalede vine)
  - `overallExplanation`: string (forklaring af match)
  - `recommendationType`: string ('simple', 'standard', 'detailed')
  - `createdAt`: timestamp

### 7. Firebase Storage Setup

Sørg for at have regler i Firebase Storage der tillader upload af billeder fra autentificerede brugere.

## App Installation

```
npm install
```

## App Start

```
npx expo start
```
