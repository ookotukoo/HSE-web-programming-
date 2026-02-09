from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category: str
    quantity: int = 0


class ProductCreate(ProductBase):
    pass


class Product(ProductBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StatsResponse(BaseModel):
    total_products: int
    total_value: float
    average_price: float
    categories_count: dict
    category_stats: dict
    price_ranges: dict
    total_categories: int