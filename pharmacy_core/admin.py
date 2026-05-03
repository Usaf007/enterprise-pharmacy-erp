from django.contrib import admin
from .models import Item, Customer, Supplier, CustomerLedger, SupplierLedger, SaleInvoice, SaleItem, PurchaseInvoice

admin.site.register(Item)
admin.site.register(Customer)
admin.site.register(Supplier)
admin.site.register(CustomerLedger)
admin.site.register(SupplierLedger)
admin.site.register(SaleInvoice)
admin.site.register(SaleItem)
admin.site.register(PurchaseInvoice)