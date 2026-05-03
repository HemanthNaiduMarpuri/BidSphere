from django.contrib import admin
from .models import User, Otp, Contact

admin.site.register(User)
admin.site.register(Otp)
admin.site.register(Contact)