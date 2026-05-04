from django.db import models
from django.contrib.auth.models import BaseUserManager, PermissionsMixin, AbstractBaseUser
from django.utils import timezone
import hashlib
from django.contrib.auth.hashers import make_password, check_password
import uuid6

class MyUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is not found")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_auctioner', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('is_staff is false')
        elif extra_fields.get('is_superuser') is not True:
            raise ValueError('is superuser is false')
        
        return self.create_user(email=email, password=password, **extra_fields)
    
    def create_auctioner(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_auctioner', True)
        return self.create_user(email=email, password=password, **extra_fields)
    
class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    wallet_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    is_staff = models.BooleanField(default=False)
    is_auctioner = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = MyUserManager()

    def __str__(self):
        return f"{self.email}"
    

class Otp(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_otp')
    otp_hashed = models.CharField(max_length=64)
    attempts = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        return (timezone.now() - self.created_at).total_seconds() < 300
    
    def set_otp(self, raw_otp):
        self.otp_hashed = make_password(raw_otp)
    
    def verify_otp(self, otp_received):
        if otp_received is None:
            return False
        return check_password(otp_received, self.otp_hashed)
    
    def  __str__(self):
        return f"{self.user} -> {self.otp_hashed[:20]}"

class Contact(models.Model):
    class STATUS_CHOICES(models.TextChoices):
        SUBMITTED = 'Submitted', 'Submitted'
        RECEIVED = 'Received', 'Received'
        SOLVED = 'Solved', 'Solved'
    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contacted_user')
    subject = models.CharField(max_length=255)
    message = models.TextField()
    image = models.ImageField(upload_to='contact-images/', blank=True, null=True)
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_contacts')
    reply = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES.choices, default=STATUS_CHOICES.SUBMITTED)
    created_at = models.DateTimeField(auto_now_add=True)
    reply_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user} -> {self.subject[:30]}"