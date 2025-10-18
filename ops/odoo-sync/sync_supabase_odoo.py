import os
import datetime
import xmlrpc.client
from supabase import create_client
from dotenv import load_dotenv
from typing import Dict, List, Optional

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Odoo configuration
ODOO_URL = os.getenv("ODOO_URL")
ODOO_DB = os.getenv("ODOO_DB")
ODOO_USER = os.getenv("ODOO_USER")
ODOO_PASSWORD = os.getenv("ODOO_PASSWORD")

def init_supabase():
    """Initialize Supabase client"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("❌ Supabase URL and KEY must be provided")
    
    try:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        raise Exception(f"❌ Failed to connect to Supabase: {e}")

def init_odoo():
    """Initialize Odoo connection and authenticate"""
    if not all([ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASSWORD]):
        raise ValueError("❌ All Odoo credentials must be provided")
    
    try:
        # Initialize common endpoint
        common = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/common")
        
        # Authenticate
        uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASSWORD, {})
        if not uid:
            raise Exception("❌ Odoo authentication failed")
        
        # Initialize models endpoint
        models = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/object")
        
        print(f"✅ Connected to Odoo as user ID: {uid}")
        return models, uid
        
    except Exception as e:
        raise Exception(f"❌ Failed to connect to Odoo: {e}")

def find_or_create_partner(models, uid, email, full_name):
    """Find existing partner by email or create a new one"""
    try:
        # Normalize email and ensure we have a valid name
        email = email.strip().lower() if email else None
        if not email:
            raise ValueError("Email is required")
            
        if not full_name or full_name.strip() == "":
            full_name = email.split('@')[0]  # Use email prefix as fallback
        
        # Search for existing partner (case-insensitive)
        res = models.execute_kw(ODOO_DB, uid, ODOO_PASSWORD,
            'res.partner', 'search_read',
            [[['email', 'ilike', email]]],
            {'fields': ['id'], 'limit': 1})
        
        if res:
            print(f"📧 Found existing partner: {email}")
            return res[0]['id']
        
        # Create new partner
        partner_id = models.execute_kw(ODOO_DB, uid, ODOO_PASSWORD,
            'res.partner', 'create',
            [{'name': full_name.strip(), 'email': email}])
        
        print(f"👤 Created new partner: {full_name} ({email})")
        return partner_id
        
    except Exception as e:
        print(f"❌ Error handling partner {email}: {e}")
        return None

def find_product(models, uid, package_id):
    """Find product by package ID (default_code)"""
    try:
        res = models.execute_kw(ODOO_DB, uid, ODOO_PASSWORD,
            'product.product', 'search_read',
            [[['default_code', '=', package_id]]],
            {'fields': ['id', 'name', 'list_price'], 'limit': 1})
        
        if res:
            product = res[0]
            print(f"📦 Found product: {product['name']} (ID: {product['id']})")
            return product
        else:
            print(f"❌ Product not found: {package_id}")
            return None
            
    except Exception as e:
        print(f"❌ Error searching for product {package_id}: {e}")
        return None

def format_odoo_datetime(iso_string):
    """Convert ISO datetime string to Odoo-compatible format"""
    try:
        if iso_string:
            # Parse ISO format and convert to Odoo format
            dt = datetime.datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
            return dt.strftime('%Y-%m-%d %H:%M:%S')
        return datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        return datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

def check_existing_order(models, uid, order_ref):
    """Check if order already exists in Odoo"""
    try:
        res = models.execute_kw(ODOO_DB, uid, ODOO_PASSWORD,
            'sale.order', 'search_read',
            [[['client_order_ref', '=', order_ref]]],
            {'fields': ['id'], 'limit': 1})
        return res[0]['id'] if res else None
    except Exception:
        return None

def create_order(models, uid, partner_id, product, order_ref, date_order):
    """Create sales order with order line"""
    try:
        # Check if order already exists
        existing_order = check_existing_order(models, uid, order_ref)
        if existing_order:
            print(f"📋 Order already exists: {order_ref} (ID: {existing_order})")
            return existing_order
        
        # Format date for Odoo
        formatted_date = format_odoo_datetime(date_order)
        
        # Create sales order
        order_id = models.execute_kw(ODOO_DB, uid, ODOO_PASSWORD,
            'sale.order', 'create',
            [{
                'partner_id': partner_id,
                'client_order_ref': order_ref,
                'date_order': formatted_date
            }])

        # Create order line
        models.execute_kw(ODOO_DB, uid, ODOO_PASSWORD,
            'sale.order.line', 'create',
            [{
                'order_id': order_id,
                'product_id': product['id'],
                'product_uom_qty': 1,
                'price_unit': product['list_price'],
                'name': product['name']
            }])
        
        print(f"📋 Created order {order_id} with reference: {order_ref}")
        return order_id
        
    except Exception as e:
        print(f"❌ Error creating order {order_ref}: {e}")
        return None

def get_missing_products(models, uid, package_ids: List[str]) -> List[str]:
    """Get list of package IDs that don't exist as products in Odoo"""
    missing = []
    for package_id in set(package_ids):  # Remove duplicates
        res = models.execute_kw(ODOO_DB, uid, ODOO_PASSWORD,
            'product.product', 'search',
            [[['default_code', '=', package_id]]],
            {'limit': 1})
        if not res:
            missing.append(package_id)
    return missing

def log_sync_result(order_id: str, status: str, odoo_order_id: Optional[int] = None, error_message: Optional[str] = None):
    """Log sync result (for future enhancement with a sync_log table)"""
    # For now, just print the result - in the future this could write to a sync_log table
    timestamp = datetime.datetime.now().isoformat()
    if status == "success":
        print(f"📋 Sync log: {order_id} -> Odoo ID {odoo_order_id} at {timestamp}")
    else:
        print(f"❌ Sync log: {order_id} failed - {error_message} at {timestamp}")

def import_airalo_packages_to_odoo():
    """Import des produits Airalo depuis Supabase vers Odoo"""
    print("🚀 Import des produits Airalo depuis Supabase vers Odoo...")

    try:
        # Initialize connections
        supabase = init_supabase()
        models, uid = init_odoo()

        packages = supabase.table("airalo_packages").select("*").execute().data

        if not packages:
            print("ℹ️ Aucun package trouvé dans Supabase")
            return

        print(f"📦 {len(packages)} packages à traiter")
        created_count = 0

        for row in packages:
            package_id = row.get("airalo_id")
            region = row.get("region") or ""
            name = f"{row.get('name')} [{region}]" if region else row.get("name")
            price = row.get("final_price_eur") or row.get("price_eur") or 0.0
            description = row.get("description") or ""
            data_amount = row.get("data_amount")
            data_unit = row.get("data_unit")
            validity_days = row.get("validity_days")

            if not package_id or not name:
                print(f"⛔ Package incomplet (airalo_id ou name manquant) : {row}")
                continue

            # Description enrichie
            full_description = f"{description}\n{data_amount} {data_unit} pour {validity_days} jours".strip()
            if region:
                full_description += f"\nRégion : {region}"

            # Vérifier si le produit existe déjà dans Odoo
            existing = models.execute_kw(
                ODOO_DB, uid, ODOO_PASSWORD,
                'product.product', 'search',
                [[['default_code', '=', package_id]]],
                {'limit': 1}
            )

            if existing:
                print(f"🔁 Produit déjà existant : {package_id}")
                continue

            vals = {
                'name': name,
                'default_code': package_id,
                'list_price': float(price),
                'type': 'service',
                'sale_ok': True,
                'purchase_ok': False,
                'description': full_description,
            }

            try:
                product_id = models.execute_kw(
                    ODOO_DB, uid, ODOO_PASSWORD,
                    'product.product', 'create',
                    [vals]
                )
                print(f"✅ Produit créé dans Odoo : {name} (ID: {product_id})")
                created_count += 1
            except Exception as e:
                print(f"❌ Erreur création produit {name} : {e}")

        print(f"🎉 Import terminé. {created_count} produits créés.")
        
    except Exception as e:
        print(f"💥 Erreur critique lors de l'import : {e}")
        raise

def sync_airalo_orders():
    """Fonction principale de synchronisation"""
    print("⏳ Synchronisation Supabase ➝ Odoo...")
    
    try:
        # Initialize connections
        supabase = init_supabase()
        models, uid = init_odoo()
        
        # Fetch all orders from Supabase
        print("📡 Récupération des commandes depuis Supabase...")
        response = supabase.table("airalo_orders").select("*").execute()
        rows = response.data
        
        if not rows:
            print("ℹ️ Aucune commande trouvée dans Supabase")
            return
        
        print(f"📊 {len(rows)} commandes à traiter")
        
        # Process each order
        success_count = 0
        
        for row in rows:
            email = row.get("email")
            nom = row.get("nom") or ""
            prenom = row.get("prenom") or ""
            full_name = f"{prenom} {nom}".strip()
            package_id = row.get("package_id")
            order_ref = row.get("order_id")
            date_order = row.get("created_at") or datetime.datetime.now().isoformat()

            if not email or not package_id or not order_ref:
                print(f"⛔ Données incomplètes : {row}")
                continue

            # 🛑 Éviter les doublons : vérifie si la commande existe déjà dans Odoo
            existing_orders = models.execute_kw(
                ODOO_DB, uid, ODOO_PASSWORD,
                'sale.order', 'search',
                [[['client_order_ref', '=', order_ref]]],
                {'limit': 1}
            )

            if existing_orders:
                print(f"🔁 Commande déjà existante dans Odoo pour ref {order_ref}, ignorée.")
                continue

            # 🟢 Si la commande n'existe pas, on continue
            partner_id = find_or_create_partner(models, uid, email, full_name)
            if not partner_id:
                continue
                
            product = find_product(models, uid, package_id)
            if not product:
                print(f"❌ Produit introuvable : {package_id}")
                continue

            order_id = create_order(models, uid, partner_id, product, order_ref, date_order)
            if order_id:
                print(f"✅ Commande Odoo créée : ID {order_id} pour {full_name}")
                success_count += 1

        print(f"🎉 Synchronisation terminée. {success_count} commandes créées.")
            
    except Exception as e:
        print(f"💥 Erreur critique lors de la synchronisation : {e}")
        raise

if __name__ == "__main__":
    import sys
    
    try:
        # Check command line argument for operation mode
        if len(sys.argv) > 1 and sys.argv[1] == "import":
            import_airalo_packages_to_odoo()
        else:
            sync_airalo_orders()
    except KeyboardInterrupt:
        print("\n⏹️ Opération interrompue par l'utilisateur")
    except Exception as e:
        print(f"\n💥 Opération échouée : {e}")
        exit(1)