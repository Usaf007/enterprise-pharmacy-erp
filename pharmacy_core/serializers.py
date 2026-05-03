from rest_framework import serializers
from django.db import transaction
from .models import (Item, Customer, Supplier, CustomerLedger, SupplierLedger, 
                     SaleInvoice, SaleItem, PurchaseInvoice, PurchaseItem, Expense)

class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class CustomerLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerLedger
        fields = '__all__'

class SupplierLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierLedger
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

# ==========================================
# PURCHASE SERIALIZERS & AUTOMATION
# ==========================================
class PurchaseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseItem
        fields = '__all__'
        read_only_fields = ('invoice',)

class PurchaseInvoiceSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True) 

    class Meta:
        model = PurchaseInvoice
        fields = '__all__'

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        invoice = PurchaseInvoice.objects.create(**validated_data)
        
        for item_data in items_data:
            PurchaseItem.objects.create(invoice=invoice, **item_data)
            
            # 🚀 THE UPSERT INVENTORY AUTOMATION
            code = item_data.get('code')
            qty_purchased = item_data.get('qty', 0)
            
            # Try to find the item. If it doesn't exist, create it!
            item_obj, created = Item.objects.get_or_create(
                code=code,
                defaults={
                    'name': item_data.get('name', 'Unknown Item'),
                    'batch': item_data.get('batch', ''),
                    'tp': item_data.get('tp', 0),
                    'retail': item_data.get('retail', 0),
                    'stock': qty_purchased, # Initial stock is what we just bought
                    'location': 'Unassigned'
                }
            )
            
            # If it ALREADY existed, just update the stock and latest prices
            if not created:
                item_obj.stock += qty_purchased
                item_obj.tp = item_data.get('tp', item_obj.tp) # Update TP to latest
                item_obj.retail = item_data.get('retail', item_obj.retail) # Update Retail to latest
                if item_data.get('batch'):
                    item_obj.batch = item_data.get('batch') # Update batch
                item_obj.save()

        # 🚀 SUPPLIER ACCOUNTING AUTOMATION
        supplier_code = validated_data.get('supplier_code')
        if supplier_code:
            supplier = Supplier.objects.filter(code=supplier_code).first()
            if supplier:
                net_due = validated_data.get('grand_total', 0) - validated_data.get('paid_amount', 0)
                supplier.current_balance += net_due
                supplier.save()
                
                SupplierLedger.objects.create(
                    supplier=supplier,
                    ref_no=invoice.invoice_no,
                    detail="Stock Purchase Invoice",
                    amt_bill=validated_data.get('grand_total', 0),
                    amt_paid=validated_data.get('paid_amount', 0),
                    running_balance=supplier.current_balance
                )

        return invoice

# ==========================================
# SALE SERIALIZERS & AUTOMATION
# ==========================================
class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = '__all__'
        read_only_fields = ('invoice',)

class SaleInvoiceSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)

    class Meta:
        model = SaleInvoice
        fields = '__all__'

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        invoice = SaleInvoice.objects.create(**validated_data)
        
        for item_data in items_data:
            SaleItem.objects.create(invoice=invoice, **item_data)
            
            # 🚀 INVENTORY AUTOMATION: Deduct from Stock
            item_obj = Item.objects.filter(code=item_data.get('code')).first()
            if item_obj:
                item_obj.stock -= item_data.get('qty', 0)
                item_obj.save()

        # 🚀 CUSTOMER ACCOUNTING AUTOMATION
        customer_code = validated_data.get('customer_code')
        if customer_code:
            customer = Customer.objects.filter(code=customer_code).first()
            if customer:
                net_due = validated_data.get('net_total', 0) - validated_data.get('paid_amount', 0)
                customer.current_balance += net_due
                customer.save()
                
                CustomerLedger.objects.create(
                    customer=customer,
                    ref_no=f"INV-{invoice.id}",
                    detail="Sale Invoice",
                    amt_due=validated_data.get('net_total', 0),
                    amt_rec=validated_data.get('paid_amount', 0),
                    running_balance=customer.current_balance
                )

        return invoice