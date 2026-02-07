// ========== КОНФИГУРАЦИЯ ==========
const API_BASE_URL = 'http://localhost:8000';

// ========== ОБЩИЕ ФУНКЦИИ ==========
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'flex';

        // Автоматически скрыть через 5 секунд
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// ========== ГЛАВНАЯ СТРАНИЦА (index.html) ==========
if (window.location.pathname.includes('index.html') ||
    window.location.pathname === '/' ||
    window.location.pathname === '') {

    console.log('📦 Инициализация главной страницы товаров');

    let currentPage = 1;
    const itemsPerPage = 10;
    let allProducts = [];
    let filteredProducts = [];

    // Загрузка категорий
    async function loadCategories() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/categories`);
            if (!response.ok) throw new Error('Ошибка загрузки категорий');

            const categories = await response.json();
            const categorySelect = document.getElementById('category');

            if (categorySelect) {
                // Очищаем существующие опции (кроме первой)
                while (categorySelect.options.length > 1) {
                    categorySelect.remove(1);
                }

                // Добавляем категории
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
        }
    }

    // Загрузка товаров
    async function loadProducts() {
        const loadingEl = document.getElementById('loading');
        const productsContainer = document.getElementById('products-container');
        const paginationEl = document.getElementById('pagination');

        if (loadingEl) loadingEl.style.display = 'block';
        if (productsContainer) productsContainer.style.display = 'none';
        if (paginationEl) paginationEl.style.display = 'none';

        try {
            // Получаем параметры фильтрации
            const category = document.getElementById('category')?.value || '';
            const minPrice = document.getElementById('min-price')?.value || '';
            const maxPrice = document.getElementById('max-price')?.value || '';
            const sortBy = document.getElementById('sort-by')?.value || '';

            // Строим URL запроса
            let url = `${API_BASE_URL}/api/products?limit=1000`;
            if (category) url += `&category=${encodeURIComponent(category)}`;
            if (minPrice) url += `&min_price=${minPrice}`;
            if (maxPrice) url += `&max_price=${maxPrice}`;
            if (sortBy) url += `&sort_by=${sortBy}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ошибка: ${response.status}`);
            }

            allProducts = await response.json();
            filteredProducts = [...allProducts];

            // Обновляем информацию о количестве
            const totalCountEl = document.getElementById('total-count');
            if (totalCountEl) {
                totalCountEl.textContent = allProducts.length;
            }

            // Показываем таблицу
            if (loadingEl) loadingEl.style.display = 'none';
            if (productsContainer) productsContainer.style.display = 'block';
            if (paginationEl) paginationEl.style.display = 'flex';

            renderProducts();
            updatePagination();

        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            if (loadingEl) {
                loadingEl.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="color: #f56565;"></i>
                    <p>Ошибка загрузки товаров: ${error.message}</p>
                    <button class="btn btn-primary" onclick="loadProducts()" style="margin-top: 1rem;">
                        <i class="fas fa-redo"></i> Попробовать снова
                    </button>
                `;
            }
            showNotification(`Ошибка загрузки товаров: ${error.message}`, 'error');
        }
    }

    // Отрисовка товаров
    function renderProducts() {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageProducts = filteredProducts.slice(startIndex, endIndex);

        tbody.innerHTML = '';

        if (pageProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 3rem; color: #666;">
                        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <h3 style="margin-bottom: 0.5rem;">Товары не найдены</h3>
                        <p>Попробуйте изменить параметры фильтрации</p>
                    </td>
                </tr>
            `;
            return;
        }

        pageProducts.forEach(product => {
            const row = document.createElement('tr');

            // Форматируем дату
            let dateStr = '-';
            if (product.created_at) {
                try {
                    const date = new Date(product.created_at);
                    dateStr = date.toLocaleDateString('ru-RU');
                } catch (e) {
                    console.error('Ошибка форматирования даты:', e);
                }
            }

            // Определяем класс для категории
            const categoryClass = `category-${product.category}`;
            const categoryName = product.category ?
                product.category.charAt(0).toUpperCase() + product.category.slice(1) :
                'Не указана';

            row.innerHTML = `
                <td><strong>${product.name || 'Без названия'}</strong></td>
                <td>${product.description || '-'}</td>
                <td><span class="category-badge ${categoryClass}">${categoryName}</span></td>
                <td><strong>${(product.price || 0).toLocaleString('ru-RU')} ₽</strong></td>
                <td>${product.quantity || 0} шт.</td>
                <td>${dateStr}</td>
            `;

            tbody.appendChild(row);
        });
    }

    // Обновление пагинации
    function updatePagination() {
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');

        if (!pageInfo || !prevBtn || !nextBtn) return;

        const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
        const displayPage = totalPages === 0 ? 0 : currentPage;

        pageInfo.textContent = `Страница ${displayPage} из ${totalPages}`;
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages || totalPages === 0;
    }

    // Смена страницы
    function changePage(delta) {
        const newPage = currentPage + delta;
        const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            renderProducts();
            updatePagination();

            // Прокрутка к верху таблицы
            const productsContainer = document.getElementById('products-container');
            if (productsContainer) {
                productsContainer.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    // Применение фильтров
    function applyFilters() {
        console.log('🔍 Применение фильтров');
        currentPage = 1;
        loadProducts();
        showNotification('Фильтры применены', 'success');
    }

    // Сброс фильтров
    function resetFilters() {
        console.log('🔄 Сброс фильтров');
        const categorySelect = document.getElementById('category');
        const minPriceInput = document.getElementById('min-price');
        const maxPriceInput = document.getElementById('max-price');
        const sortBySelect = document.getElementById('sort-by');

        if (categorySelect) categorySelect.value = '';
        if (minPriceInput) minPriceInput.value = '';
        if (maxPriceInput) maxPriceInput.value = '';
        if (sortBySelect) sortBySelect.value = '';

        currentPage = 1;
        loadProducts();
        showNotification('Фильтры сброшены', 'info');
    }

    // Создание тестовых данных
    async function createTestData() {
        if (!confirm('Создать тестовые данные? Существующие товары будут удалены.')) {
            return;
        }

        try {
            showNotification('Создание тестовых данных...', 'info');

            // Удаляем существующие товары
            await fetch(`${API_BASE_URL}/api/products`, {
                method: 'DELETE'
            });

            // Создаем тестовые данные
            const response = await fetch(`${API_BASE_URL}/api/test-data`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                showNotification('Тестовые данные созданы успешно!', 'success');
                // Перезагружаем товары
                setTimeout(() => {
                    loadCategories();
                    loadProducts();
                }, 1000);
            } else {
                throw new Error(result.message || 'Неизвестная ошибка');
            }
        } catch (error) {
            console.error('Ошибка создания тестовых данных:', error);
            showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }

    // Инициализация страницы
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('📄 Главная страница загружена');

        // Загружаем категории и товары
        await loadCategories();
        await loadProducts();

        // Обновляем каждые 30 секунд
        setInterval(loadProducts, 30000);

        console.log('✅ Главная страница инициализирована');
    });

    // ========== ЭКСПОРТ ФУНКЦИЙ ==========
    window.applyFilters = applyFilters;
    window.resetFilters = resetFilters;
    window.changePage = changePage;
    window.createTestData = createTestData;
    window.loadProducts = loadProducts;
}

// ========== СТРАНИЦА ДОБАВЛЕНИЯ ТОВАРА (add_product.html) ==========

if (window.location.pathname.includes('add_product.html') ||
    window.location.pathname === '/add') {

    console.log('🛍️ Инициализация страницы добавления товара');

    // Функция добавления товара
    async function addProduct() {
        console.log('🎯 Функция addProduct вызвана');

        try {
            // Получаем данные из формы
            const name = document.getElementById('name')?.value.trim();
            const description = document.getElementById('description')?.value.trim() || '';
            const price = parseFloat(document.getElementById('price')?.value);
            const category = document.getElementById('category')?.value;
            const quantity = parseInt(document.getElementById('quantity')?.value) || 0;

            console.log('📝 Данные формы:', { name, description, price, category, quantity });

            // Валидация
            if (!name || !name.length) {
                showNotification('Введите название товара', 'error');
                document.getElementById('name')?.focus();
                return;
            }

            if (isNaN(price) || price <= 0) {
                showNotification('Введите корректную цену (больше 0)', 'error');
                document.getElementById('price')?.focus();
                return;
            }

            if (!category) {
                showNotification('Выберите категорию', 'error');
                document.getElementById('category')?.focus();
                return;
            }

            if (quantity < 0) {
                showNotification('Количество не может быть отрицательным', 'error');
                document.getElementById('quantity')?.focus();
                return;
            }

            // Создаем объект товара
            const product = {
                name: name,
                description: description,
                price: price,
                category: category,
                quantity: quantity
            };

            console.log('🚀 Отправка товара:', product);

            // Показываем статус загрузки
            const statusEl = document.getElementById('form-status');
            if (statusEl) {
                statusEl.innerHTML = `
                    <div style="background: #e6fffa; color: #234e52; padding: 1rem; border-radius: 8px;">
                        <i class="fas fa-spinner fa-spin"></i> Отправка данных на сервер...
                    </div>
                `;
                statusEl.style.display = 'block';
            }

            // Отправляем запрос
            const response = await fetch(`${API_BASE_URL}/api/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(product)
            });

            const result = await response.json();

            if (statusEl) {
                statusEl.style.display = 'none';
            }

            if (!response.ok) {
                throw new Error(result.detail || 'Ошибка сервера');
            }

            if (result.success) {
                showNotification('✅ Товар успешно добавлен!', 'success');

                // Очищаем форму
                clearForm();

                // Перенаправление через 2 секунды
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                throw new Error(result.message || 'Неизвестная ошибка');
            }

        } catch (error) {
            console.error('💥 Ошибка добавления товара:', error);
            showNotification(`❌ Ошибка: ${error.message}`, 'error');

            const statusEl = document.getElementById('form-status');
            if (statusEl) {
                statusEl.innerHTML = `
                    <div style="background: #fed7d7; color: #9b2c2c; padding: 1rem; border-radius: 8px;">
                        <i class="fas fa-exclamation-triangle"></i> Ошибка: ${error.message}
                    </div>
                `;
                statusEl.style.display = 'block';
            }
        }
    }

    // Функция очистки формы
    function clearForm() {
        const nameInput = document.getElementById('name');
        const descriptionInput = document.getElementById('description');
        const priceInput = document.getElementById('price');
        const categorySelect = document.getElementById('category');
        const quantityInput = document.getElementById('quantity');
        const statusEl = document.getElementById('form-status');

        if (nameInput) nameInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        if (priceInput) priceInput.value = '';
        if (categorySelect) categorySelect.value = '';
        if (quantityInput) quantityInput.value = '0';
        if (statusEl) statusEl.style.display = 'none';

        if (nameInput) nameInput.focus();
        showNotification('Форма очищена', 'info');
    }

    // Инициализация страницы
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 Страница добавления товара загружена');

        // Добавляем обработчики Enter для формы
        const formInputs = document.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (this.tagName === 'TEXTAREA') {
                        return; // Не отправляем форму при Enter в textarea
                    }
                    addProduct();
                }
            });
        });

        // Фокус на первом поле
        const nameInput = document.getElementById('name');
        if (nameInput) {
            nameInput.focus();
        }

        console.log('✅ Страница добавления товара инициализирована');
    });

    // ========== ЭКСПОРТ ФУНКЦИЙ ==========
    window.addProduct = addProduct;
    window.clearForm = clearForm;
}

// ========== СТРАНИЦА СТАТИСТИКИ (stats.html) ==========

if (window.location.pathname.includes('stats.html') ||
    window.location.pathname === '/stats') {

    console.log('📊 Инициализация страницы статистики');

    let categoryChart = null;
    let priceChart = null;
    let valueChart = null;

    // Загрузка статистики
    async function loadStatistics() {
        const loadingEl = document.getElementById('loading');
        const statsGrid = document.getElementById('stats-grid');
        const chartsContainer = document.getElementById('charts-container');
        const detailsContainer = document.getElementById('details-container');

        if (loadingEl) loadingEl.style.display = 'block';
        if (statsGrid) statsGrid.style.display = 'none';
        if (chartsContainer) chartsContainer.style.display = 'none';
        if (detailsContainer) detailsContainer.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/api/stats`);
            if (!response.ok) {
                throw new Error(`HTTP ошибка: ${response.status}`);
            }

            const stats = await response.json();
            console.log('📈 Статистика загружена:', stats);

            // Обновляем основные показатели
            updateBasicStats(stats);

            // Обновляем детали по категориям
            updateCategoryDetails(stats.category_stats);

            // Строим графики
            buildCharts(stats);

            // Показываем контент
            if (loadingEl) loadingEl.style.display = 'none';
            if (statsGrid) statsGrid.style.display = 'grid';
            if (chartsContainer) chartsContainer.style.display = 'block';
            if (detailsContainer) detailsContainer.style.display = 'block';

            showNotification('Статистика обновлена', 'success');

        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);

            if (loadingEl) {
                loadingEl.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="color: #f56565;"></i>
                    <p>Ошибка загрузки статистики: ${error.message}</p>
                    <button class="btn btn-primary" onclick="loadStatistics()" style="margin-top: 1rem;">
                        <i class="fas fa-redo"></i> Попробовать снова
                    </button>
                `;
            }

            showNotification(`Ошибка загрузки статистики: ${error.message}`, 'error');
        }
    }

    // Обновление основных показателей
    function updateBasicStats(stats) {
        const totalProductsEl = document.getElementById('total-products');
        const totalValueEl = document.getElementById('total-value');
        const avgPriceEl = document.getElementById('avg-price');
        const totalCategoriesEl = document.getElementById('total-categories');

        if (totalProductsEl) totalProductsEl.textContent = stats.total_products || 0;
        if (totalValueEl) totalValueEl.textContent = `${(stats.total_value || 0).toLocaleString('ru-RU')} ₽`;
        if (avgPriceEl) avgPriceEl.textContent = `${(stats.average_price || 0).toLocaleString('ru-RU')} ₽`;
        if (totalCategoriesEl) totalCategoriesEl.textContent = stats.total_categories || 0;
    }

    // Обновление деталей по категориям
    function updateCategoryDetails(categoryStats) {
        const container = document.getElementById('category-details');
        if (!container) return;

        container.innerHTML = '';

        if (!categoryStats || Object.keys(categoryStats).length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-info-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Нет данных по категориям</p>
                </div>
            `;
            return;
        }

        for (const [category, stats] of Object.entries(categoryStats)) {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <h3><i class="fas fa-tag"></i> ${categoryName}</h3>
                <div style="margin-top: 1rem;">
                    <p><strong><i class="fas fa-box"></i> Товаров:</strong> ${stats.count || 0}</p>
                    <p><strong><i class="fas fa-money-bill-wave"></i> Общая стоимость:</strong> ${(stats.total_value || 0).toLocaleString('ru-RU')} ₽</p>
                    <p><strong><i class="fas fa-calculator"></i> Средняя цена:</strong> ${(stats.average_price || 0).toLocaleString('ru-RU')} ₽</p>
                    <p><strong><i class="fas fa-cubes"></i> Общее количество:</strong> ${stats.total_quantity || 0} шт.</p>
                </div>
            `;
            container.appendChild(card);
        }
    }

    // Построение графиков
    function buildCharts(stats) {
        // Уничтожаем старые графики
        if (categoryChart) categoryChart.destroy();
        if (priceChart) priceChart.destroy();
        if (valueChart) valueChart.destroy();

        // 1. График распределения по категориям
        const categoryCanvas = document.getElementById('categoryChart');
        if (categoryCanvas && stats.categories_count && Object.keys(stats.categories_count).length > 0) {
            const ctx = categoryCanvas.getContext('2d');
            const categories = Object.keys(stats.categories_count);
            const counts = Object.values(stats.categories_count);

            categoryChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
                    datasets: [{
                        label: 'Количество товаров',
                        data: counts,
                        backgroundColor: [
                            '#667eea', '#764ba2', '#f56565',
                            '#48bb78', '#ed8936', '#4299e1',
                            '#9f7aea', '#ed64a6'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }

        // 2. График распределения по ценам
        const priceCanvas = document.getElementById('priceChart');
        if (priceCanvas && stats.price_ranges) {
            const ctx = priceCanvas.getContext('2d');
            const labels = ['0-1000 ₽', '1000-5000 ₽', '5000-10000 ₽', '10000+ ₽'];
            const data = Object.values(stats.price_ranges);

            priceChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#4299e1', '#48bb78', '#ed8936', '#f56565'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }

        // 3. График стоимости по категориям
        const valueCanvas = document.getElementById('valueChart');
        if (valueCanvas && stats.category_stats && Object.keys(stats.category_stats).length > 0) {
            const ctx = valueCanvas.getContext('2d');
            const categories = Object.keys(stats.category_stats);
            const values = categories.map(cat => stats.category_stats[cat].total_value || 0);

            valueChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
                    datasets: [{
                        label: 'Стоимость (₽)',
                        data: values,
                        borderColor: '#764ba2',
                        backgroundColor: 'rgba(118, 75, 162, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString('ru-RU') + ' ₽';
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Стоимость: ${context.parsed.y.toLocaleString('ru-RU')} ₽`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // Инициализация страницы
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 Страница статистики загружена');
        loadStatistics();

        // Обновляем статистику каждые 60 секунд
        setInterval(loadStatistics, 60000);

        console.log('✅ Страница статистики инициализирована');
    });

    // ========== ЭКСПОРТ ФУНКЦИЙ ==========
    window.loadStatistics = loadStatistics;
}

// ========== ГЛОБАЛЬНЫЙ ЭКСПОРТ ОБЩИХ ФУНКЦИЙ ==========
window.showNotification = showNotification;

// ========== ДИАГНОСТИКА ==========
setTimeout(() => {
    console.log('=== ДИАГНОСТИКА ЭКСПОРТА ===');
    console.log('applyFilters:', typeof window.applyFilters);
    console.log('resetFilters:', typeof window.resetFilters);
    console.log('changePage:', typeof window.changePage);
    console.log('addProduct:', typeof window.addProduct);
    console.log('clearForm:', typeof window.clearForm);
    console.log('loadStatistics:', typeof window.loadStatistics);
    console.log('createTestData:', typeof window.createTestData);
    console.log('showNotification:', typeof window.showNotification);
}, 2000);

console.log('✅ script.js загружен и инициализирован');