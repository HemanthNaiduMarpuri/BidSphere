from celery import Celery
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auction.settings')

app = Celery('auction')

app.conf.update(
    broker_url='redis://127.0.0.1:6379/0',
    result_backend='redis://127.0.0.1:6379/0',
    task_ignore_result=True
)

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks(['users'])
