# Pagana API - Backend

## Overview

This is the backend API for the Pagana multi-platform application, built with **Django** and **Django REST Framework (DRF)**.

## ⚠️ Status

This is a **placeholder structure** for architecture visualization. Full implementation will be developed during the project lifecycle.

## Technology Stack

- **Django** 4.2+ - Web framework
- **Django REST Framework** - RESTful API framework
- **django-cors-headers** - CORS handling for cross-origin requests
- **SQLite** (default) / PostgreSQL / MySQL - Database

## Project Structure

```
pagana-api/
├── pagana_api/          # Django project configuration
│   ├── __init__.py
│   ├── settings.py      # Django settings
│   ├── urls.py          # Root URL configuration
│   ├── wsgi.py          # WSGI config for production
│   └── asgi.py          # ASGI config for async support
├── apps/                # Django applications
│   ├── __init__.py
│   └── core/           # Core app (placeholder)
│       ├── __init__.py
│       ├── apps.py
│       ├── models.py
│       ├── views.py
│       ├── serializers.py
│       ├── urls.py
│       └── admin.py
├── manage.py           # Django management script
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

## Installation

1. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

4. **Create a superuser:**
   ```bash
   python manage.py createsuperuser
   ```

5. **Run the development server:**
   ```bash
   python manage.py runserver
   ```

The API will be available at `http://127.0.0.1:8000/`

## Configuration

### Environment Variables

Create a `.env` file in the root directory for environment-specific settings:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
```

### Database Configuration

By default, the project uses SQLite. To use PostgreSQL or MySQL:

1. Install the appropriate database adapter in `requirements.txt`
2. Update `DATABASES` in `settings.py`
3. Run migrations: `python manage.py migrate`

## API Structure

The API will follow RESTful conventions:

- `/api/v1/` - API endpoints
- `/admin/` - Django admin interface
- `/api/docs/` - API documentation (when configured)

## Development Notes

- All Django apps should be placed in the `apps/` directory
- Use Django REST Framework serializers for API data validation
- Follow Django best practices for models, views, and URLs
- Implement proper authentication and permissions

## Future Development

- JWT authentication setup
- API documentation with drf-spectacular or similar
- Comprehensive test suite
- CI/CD pipeline configuration
- Production deployment settings

