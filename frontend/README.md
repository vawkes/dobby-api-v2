# GridCube Management Frontend

This is the frontend application for the GridCube Management System. It provides a user interface for managing and monitoring GridCube devices.

## Features

- User authentication (login, registration, password reset)
- Dashboard with device overview
- Device listing and filtering
- Responsive design for desktop and mobile

## Technologies Used

- Next.js 14 (React framework)
- TypeScript
- Tailwind CSS (styling)
- React Hook Form (form handling)
- Zod (validation)
- Axios (API requests)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the frontend directory:
   ```
   cd frontend
   ```
3. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

### Configuration

Create a `.env.local` file in the root of the frontend directory with the following variables:

```
API_URL=http://your-backend-api-url
NEXT_PUBLIC_API_URL=/api
```

- `API_URL`: The URL of your backend API (used by the server-side API proxy)
- `NEXT_PUBLIC_API_URL`: The URL that the frontend will use to make API requests (should point to the API proxy)

### Development

Run the development server:

```
npm run dev
```

or

```
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Building for Production

Build the application:

```
npm run build
```

or

```
yarn build
```

Start the production server:

```
npm run start
```

or

```
yarn start
```

## Project Structure

- `src/app`: Next.js app router pages
- `src/components`: Reusable UI components
- `src/context`: React context providers
- `src/services`: API service functions
- `src/types`: TypeScript type definitions

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
