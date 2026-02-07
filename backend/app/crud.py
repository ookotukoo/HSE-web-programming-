from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas


def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()


def get_products(db: Session, skip: int = 0, limit: int = 100,
                 category: str = None, min_price: float = None,
                 max_price: float = None, sort_by: str = None):
    query = db.query(models.Product)

    # Фильтрация
    if category and category != "":
        query = query.filter(models.Product.category == category)
    if min_price is not None:
        query = query.filter(models.Product.price >= min_price)
    if max_price is not None:
        query = query.filter(models.Product.price <= max_price)

    # Сортировка
    if sort_by == "price_asc":
        query = query.order_by(models.Product.price.asc())
    elif sort_by == "price_desc":
        query = query.order_by(models.Product.price.desc())
    elif sort_by == "name":
        query = query.order_by(models.Product.name.asc())
    elif sort_by == "newest":
        query = query.order_by(models.Product.created_at.desc())
    else:
        query = query.order_by(models.Product.id.asc())

    return query.offset(skip).limit(limit).all()


def create_product(db: Session, product: schemas.ProductCreate):
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


def get_categories(db: Session):
    result = db.query(models.Product.category).distinct().all()
    return [cat[0] for cat in result]


def get_statistics(db: Session):
    # Общая статистика
    total_products = db.query(func.count(models.Product.id)).scalar() or 0

    total_value_result = db.query(func.sum(models.Product.price * models.Product.quantity)).scalar()
    total_value = float(total_value_result) if total_value_result else 0.0

    avg_price_result = db.query(func.avg(models.Product.price)).scalar()
    avg_price = float(avg_price_result) if avg_price_result else 0.0

    # Статистика по категориям
    categories = get_categories(db)
    categories_count = {}
    category_stats = {}

    for category in categories:
        count = db.query(func.count(models.Product.id)).filter(
            models.Product.category == category
        ).scalar() or 0

        cat_value_result = db.query(func.sum(models.Product.price * models.Product.quantity)).filter(
            models.Product.category == category
        ).scalar()
        cat_value = float(cat_value_result) if cat_value_result else 0.0

        cat_avg_result = db.query(func.avg(models.Product.price)).filter(
            models.Product.category == category
        ).scalar()
        cat_avg = float(cat_avg_result) if cat_avg_result else 0.0

        cat_quantity = db.query(func.sum(models.Product.quantity)).filter(
            models.Product.category == category
        ).scalar() or 0

        categories_count[category] = count
        category_stats[category] = {
            "count": count,
            "total_value": round(cat_value, 2),
            "average_price": round(cat_avg, 2),
            "total_quantity": cat_quantity
        }

    # Распределение по ценам
    price_ranges = {
        "0-1000": db.query(func.count(models.Product.id)).filter(
            models.Product.price <= 1000
        ).scalar() or 0,
        "1000-5000": db.query(func.count(models.Product.id)).filter(
            models.Product.price > 1000, models.Product.price <= 5000
        ).scalar() or 0,
        "5000-10000": db.query(func.count(models.Product.id)).filter(
            models.Product.price > 5000, models.Product.price <= 10000
        ).scalar() or 0,
        "10000+": db.query(func.count(models.Product.id)).filter(
            models.Product.price > 10000
        ).scalar() or 0,
    }

    return {
        "total_products": total_products,
        "total_value": round(total_value, 2),
        "average_price": round(avg_price, 2),
        "categories_count": categories_count,
        "category_stats": category_stats,
        "price_ranges": price_ranges,
        "total_categories": len(categories)
    }