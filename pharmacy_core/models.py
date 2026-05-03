from django.db import models
from django.utils import timezone

# ==========================================
# 1. INVENTORY 
# ==========================================
class Item(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    batch = models.CharField(max_length=100, blank=True, null=True)
    tp = models.DecimalField(max_digits=10, decimal_places=2, help_text="Trade Price")
    retail = models.DecimalField(max_digits=10, decimal_places=2, help_text="Sale Price")
    stock = models.IntegerField(default=0)
    location = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

# ==========================================
# 2. DIRECTORY (Customers & Suppliers)
# ==========================================
class Customer(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=255, blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    cnic = models.CharField(max_length=20, blank=True, null=True)
    license_no = models.CharField(max_length=100, blank=True, null=True)
    cust_type = models.CharField(max_length=50, default="0 General")
    area = models.CharField(max_length=100, default="0 Local")
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return self.name

class Supplier(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    agent = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return self.name

# ==========================================
# 3. ACCOUNTING LEDGERS
# ==========================================
class CustomerLedger(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    ref_no = models.CharField(max_length=50, default="0")
    detail = models.CharField(max_length=255, default="Cash")
    amt_due = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    amt_rec = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    running_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

class SupplierLedger(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    ref_no = models.CharField(max_length=50, default="0")
    detail = models.CharField(max_length=255, default="Cash Paid")
    amt_bill = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    amt_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    running_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

# ==========================================
# 4. TRANSACTIONS: PURCHASES
# ==========================================
class PurchaseInvoice(models.Model):
    supplier_code = models.CharField(max_length=50, blank=True, null=True)
    # 🚀 FIXED: Added blank=True, null=True so it is no longer strictly required
    supplier_name = models.CharField(max_length=255, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    invoice_no = models.CharField(max_length=100)
    date = models.CharField(max_length=50) 
    grand_total = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # 🚀 FIXED: Prevent crash if supplier_name is empty
        display_name = self.supplier_name if self.supplier_name else "Walk-in / Direct"
        return f"Purchase {self.invoice_no} - {display_name}"

class PurchaseItem(models.Model):
    invoice = models.ForeignKey(PurchaseInvoice, related_name='items', on_delete=models.CASCADE)
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    batch = models.CharField(max_length=100, blank=True, null=True)
    cmp = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    retail = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cp_disc = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tp = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    qty = models.IntegerField(default=0)
    bonus = models.IntegerField(default=0)
    s_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    item_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

# ==========================================
# 5. TRANSACTIONS: SALES
# ==========================================
class SaleInvoice(models.Model):
    customer_code = models.CharField(max_length=50, blank=True, null=True)
    customer_name = models.CharField(max_length=255)
    address = models.CharField(max_length=255, blank=True, null=True)
    salesman = models.CharField(max_length=100, default="GENERAL SALE")
    date = models.CharField(max_length=50)
    time = models.CharField(max_length=50, blank=True, null=True)
    net_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    profit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Sale - {self.customer_name}"

class SaleItem(models.Model):
    invoice = models.ForeignKey(SaleInvoice, related_name='items', on_delete=models.CASCADE)
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    batch = models.CharField(max_length=100, blank=True, null=True)
    tp = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    qty = models.IntegerField(default=0)
    s_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    item_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    profit = models.DecimalField(max_digits=12, decimal_places=2, default=0)

# ==========================================
# 6. CASHBOOK / EXPENSES (For Daily Reports)
# ==========================================
class Expense(models.Model):
    date = models.DateField(default=timezone.now)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    def __str__(self):
        return f"{self.date} - {self.description}: {self.amount}"