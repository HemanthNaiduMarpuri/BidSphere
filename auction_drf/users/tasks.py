from celery import shared_task
from django.core.mail import send_mail

@shared_task
def send_welcome_email(user_email):
    send_mail(
        'Welcome to BidSphere',
        'Thanks for joining with US!',
        'noreply@gmail.com',
        [user_email],
        fail_silently=False
    )

@shared_task
def changed_password(user_email, first_name, last_name, updated_date):
    send_mail(
        f'Hey {first_name} { last_name}, you changed your password.',
        f'last updated at: {updated_date}',
        "If your not updated your password, Kindly contact the Customer Support!",
        'noreply@gmail.com',
        [user_email],
        fail_silently=False
    )
