from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (ItemViewSet, CustomerViewSet, SupplierViewSet, 
                    CustomerLedgerViewSet, SupplierLedgerViewSet, 
                    SaleInvoiceViewSet, PurchaseInvoiceViewSet, ExpenseViewSet)

router = DefaultRouter()
router.register(r'items', ItemViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'customer-ledgers', CustomerLedgerViewSet)
router.register(r'supplier-ledgers', SupplierLedgerViewSet)
router.register(r'sales', SaleInvoiceViewSet)
router.register(r'purchases', PurchaseInvoiceViewSet)
router.register(r'expenses', ExpenseViewSet) # <-- Added this

urlpatterns = [
    path('', include(router.urls)),
]