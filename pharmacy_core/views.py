from rest_framework import viewsets
from .models import (Item, Customer, Supplier, CustomerLedger, SupplierLedger, 
                     SaleInvoice, PurchaseInvoice, Expense)
from .serializers import (ItemSerializer, CustomerSerializer, SupplierSerializer, 
                          CustomerLedgerSerializer, SupplierLedgerSerializer, 
                          SaleInvoiceSerializer, PurchaseInvoiceSerializer, ExpenseSerializer)

class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

class CustomerLedgerViewSet(viewsets.ModelViewSet):
    queryset = CustomerLedger.objects.all().order_by('-date', '-id')
    serializer_class = CustomerLedgerSerializer

class SupplierLedgerViewSet(viewsets.ModelViewSet):
    queryset = SupplierLedger.objects.all().order_by('-date', '-id')
    serializer_class = SupplierLedgerSerializer

class SaleInvoiceViewSet(viewsets.ModelViewSet):
    queryset = SaleInvoice.objects.all().order_by('-created_at')
    serializer_class = SaleInvoiceSerializer

class PurchaseInvoiceViewSet(viewsets.ModelViewSet):
    queryset = PurchaseInvoice.objects.all().order_by('-created_at')
    serializer_class = PurchaseInvoiceSerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by('-date', '-id')
    serializer_class = ExpenseSerializer