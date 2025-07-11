# Emitrax - EMI Tracking Application

Emitrax is a modern web application for tracking and managing EMI (Equated Monthly Installment) payments in one centralized dashboard. Built with React, TypeScript, and Vite, it provides a comprehensive solution for monitoring loan payments, remaining balances, and amortization schedules.

## Features

- **EMI Dashboard**: View all your active and completed EMIs at a glance
- **Detailed Statistics**: Track monthly payments, total outstanding amounts, and more
- **Amortization Schedule**: View detailed payment breakdowns for each EMI
- **Google Authentication**: Secure login via Google OAuth
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark/Light Theme**: Choose your preferred visual theme

## Demo

1. Log in with your Google account to access the dashboard.
2. View all your active EMIs and track remaining balances.
3. Add new EMIs by clicking on the "Add EMI" button and filling in the details.
4. Click on any EMI card to view detailed information and amortization schedule.
5. Use the filter options to sort and view EMIs by different criteria.
6. Toggle between dark and light themes based on your preference.

The application is live and accessible at [**emitrax.arzzam.in**](https://emitrax.arzzam.in)

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **State Management**: Rematch/Redux with persist for local storage
- **UI Components**: Custom UI components built with Radix UI and TailwindCSS
- **Database & Auth**: Supabase for data storage and authentication
- **Data Fetching**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: React Router v7
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- Yarn package manager
- Supabase account for database setup

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/emitrax.git
cd emitrax
```

2. Install dependencies

```bash
yarn install
```

3. Create a `.env.local` file in the root directory with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

4. Start the development server

```bash
yarn dev
```

The application will be accessible at `http://localhost:5173`.

## Deployment

The production version of Emitrax is deployed and accessible at [**emitrax.arzzam.in**](https://emitrax.arzzam.in). The application is hosted on a cloud platform and utilizes Supabase for backend services and authentication.

## Project Structure

- `src/components`: Reusable UI components
- `src/context`: React context providers
- `src/hooks`: Custom React hooks
- `src/router`: Page components and routing
- `src/store`: Rematch/Redux store configuration
- `src/supabase`: Supabase client and type definitions
- `src/utils`: Utility functions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

<details>
<summary>
Want to Contribute?
Follow the steps below to get started!
</summary>
<br>

### Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/): JavaScript runtime built on Chrome's V8 JavaScript engine.
- [Yarn](https://yarnpkg.com/): Fast, reliable, and secure dependency management.
- [Supabase](https://supabase.com/): Open source Firebase alternative for database and authentication.

### Getting Started

1. Fork this repository.

2. Clone your forked repository:

    ```bash
    git clone https://github.com/your-username/emitrax.git
    ```

3. Change directory:

    ```bash
    cd emitrax
    ```

4. Install dependencies:

    ```bash
    yarn
    ```

5. Create a `.env.local` file in the root directory with your Supabase credentials:

    ```
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_KEY=your_supabase_anon_key
    ```

6. Start the development server:

    ```bash
    yarn dev
    ```

    The application will be accessible at `http://localhost:5173`.

7. Make sure to add remote upstream:

    ```bash
    git remote add upstream https://github.com/arzzam/emitrax.git

    # To verify the new upstream repository you've specified for your fork
    git remote -v
    ```

8. Create a new branch:

    ```bash
    git checkout -b new-branch-name
    ```

9. Make changes and create a pull request to the main branch.

</details>

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Give a star ⭐ if you like this project!**
