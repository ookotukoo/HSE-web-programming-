from fastapi import FastAPI, Request, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
from pathlib import Path

from .database import SessionLocal, engine, Base
from . import models, schemas, crud

# Создаем директории
BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
STATIC_DIR = FRONTEND_DIR / "static"

app = FastAPI(title="Product Catalog API")

# Добавляем CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Монтируем статические файлы
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Настройка шаблонов
templates = Jinja2Templates(directory=str(FRONTEND_DIR))

# Создаем таблицы в БД
Base.metadata.create_all(bind=engine)


# Зависимость для получения сессии БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ========== HTML страницы ==========
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/add", response_class=HTMLResponse)
async def add_product_page(request: Request):
    return templates.TemplateResponse("add_product.html", {"request": request})


@app.get("/stats", response_class=HTMLResponse)
async def stats_page(request: Request):
    return templates.TemplateResponse("stats.html", {"request": request})


# ========== API endpoints ==========
@app.get("/api/products")
def read_products(
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        min_price: Optional[float] = Query(None, ge=0),
        max_price: Optional[float] = Query(None, ge=0),
        sort_by: Optional[str] = Query(None, pattern="^(price_asc|price_desc|name|newest)$"),
        db: Session = Depends(get_db)
):
    products = crud.get_products(
        db, skip=skip, limit=limit,
        category=category, min_price=min_price,
        max_price=max_price, sort_by=sort_by
    )
    return [product.to_dict() for product in products]


@app.post("/api/products")
def create_new_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    try:
        db_product = crud.create_product(db=db, product=product)
        return {
            "success": True,
            "message": "Товар успешно добавлен",
            "product": db_product.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/categories")
def read_categories(db: Session = Depends(get_db)):
    categories = crud.get_categories(db)
    return categories


@app.get("/api/stats")
def read_statistics(db: Session = Depends(get_db)):
    return crud.get_statistics(db)


# Эндпоинт для отладки - удалить все товары
@app.delete("/api/products")
def delete_all_products(db: Session = Depends(get_db)):
    try:
        num_deleted = db.query(models.Product).delete()
        db.commit()
        return {"success": True, "message": f"Удалено {num_deleted} товаров"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# Эндпоинт для отладки - создать тестовые данные
@app.post("/api/test-data")
def create_test_data(db: Session = Depends(get_db)):
    try:
        test_products = [
            models.Product(
                name="Ноутбук ASUS TUF Gaming",
                description="Игровой ноутбук с RTX 3060, 16GB RAM, 512GB SSD",
                price=85999,
                category="electronics",
                quantity=8
            ),
            models.Product(
                name="Футболка Nike Sport",
                description="Хлопковая футболка для занятий спортом",
                price=2499,
                category="clothing",
                quantity=25
            ),
            models.Product(
                name="Python для начинающих",
                description="Полное руководство по Python 3",
                price=1899,
                category="books",
                quantity=15
            ),
            models.Product(
                name="Кофе зерновой Lavazza",
                description="Арабика 100%, 1 кг",
                price=1499,
                category="food",
                quantity=30
            ),
            models.Product(
                name="Смартфон Samsung Galaxy S23",
                description="128GB, 8GB RAM, черный",
                price=79999,
                category="electronics",
                quantity=5
            ),
            models.Product(
                name="Джинсы Levi's 501",
                description="Классические прямые джинсы",
                price=5999,
                category="clothing",
                quantity=12
            ),
            models.Product(
                name="Clean Code by Robert Martin",
                description="Искусство чистого кода",
                price=2999,
                category="books",
                quantity=10
            ),
            models.Product(
                name="Чай зеленый Ahmad Tea",
                description="100 пакетиков, английский breakfast",
                price=899,
                category="food",
                quantity=40
            ),
        ]

        for product in test_products:
            db.add(product)
        db.commit()

        return {"success": True, "message": f"Создано {len(test_products)} тестовых товаров"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# Инициализация БД при запуске
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # Проверяем, есть ли товары
        if db.query(models.Product).count() == 0:
            print("База данных пуста. Добавьте тестовые данные через /api/test-data")
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)