from django.contrib import admin
from .models import Payment, TopUp

admin.site.register(TopUp)
admin.site.register(Payment)
