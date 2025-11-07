# ContactApp-Python-Django



## How to Clone

```
git remote add origin https://gitlab.innovaturelabs.com/root/contactapp-python-django.git

cd contactapp-python-django
```

## Installation

1. Create and activate a virtual environment:

```
python -m venv env 
```

2. Install project dependencies:

```
pip install -r requirements.txt
```

## Environment Variables

Update the environment variables according to the .env.sample file

## How to Use

1. Generate migration and apply it to set up the database

```
python manage.py makemigrations

python manage.py migrate
```

2. Run the development server:

```
API : python manage.py runserver 
WEBSOCKET : gunicorn chatbot.asgi:application     -k uvicorn.workers.UvicornWorker    --workers 4     --timeout 120
```

## Running Tests

Run automated tests with:

```
python manage.py test
```

## How to Customize

1. Project Name

- Rename the root Django project folder if needed.
- Update references to the project name in wsgi.py, asgi.py, settings.py, and manage.py.


2. App-Specific Customizations

- Create new app using :
  ```
  python manage.py startapp <app_name>
  ```

- Register new apps in INSTALLED_APPS inside settings.py.

3. URLs

- Update urls.py to include new app URLs.

