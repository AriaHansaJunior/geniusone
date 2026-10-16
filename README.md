# GENIUSONE

GENIUSONE is a Laravel 13 application with a React and TypeScript frontend.

## Requirements

- PHP 8.3 or newer with the SQLite PDO extension enabled
- Composer 2
- Node.js 20.19 or newer and npm

## Local setup

From the project directory, install dependencies, create the local environment,
initialize SQLite, run migrations, and build the frontend:

```powershell
composer setup
```

Start the Laravel and Vite development processes:

```powershell
composer dev
```

Open <http://127.0.0.1:8000>. To load the sample data, run
`php artisan db:seed` in another terminal.

## Tests

```powershell
composer test
```

The test suite uses an in-memory SQLite database and does not require local
sample data.
