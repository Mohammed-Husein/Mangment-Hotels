const httpStatusText = require('./httpStatusText');

/**
 * دالة الباجينيشن والترتيب والبحث
 * @param {Object} model - نموذج Mongoose
 * @param {Object} query - استعلام البحث
 * @param {Object} options - خيارات الباجينيشن والترتيب
 * @returns {Object} - النتائج مع معلومات الباجينيشن
 */
const paginate = async (model, query = {}, options = {}) => {
    try {
        // استخراج المعاملات من options
        const {
            page = 1,
            limit = 8,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search = '',
            searchFields = [],
            populate = '',
            select = '',
            filters = {}
        } = options;

        // التحقق من صحة المعاملات
        const pageNumber = Math.max(1, parseInt(page));
        const limitNumber = Math.min(100, Math.max(1, parseInt(limit))); // حد أقصى 100 عنصر
        const skip = (pageNumber - 1) * limitNumber;

        // بناء استعلام البحث
        let searchQuery = { ...query };

        // إضافة البحث النصي إذا تم تحديده
        if (search && searchFields.length > 0) {
            const searchConditions = searchFields.map(field => ({
                [field]: { $regex: search, $options: 'i' }
            }));
            searchQuery.$or = searchConditions;
        }

        // إضافة الفلاتر
        if (filters && Object.keys(filters).length > 0) {
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                    // معالجة الفلاتر المختلفة
                    if (typeof filters[key] === 'boolean') {
                        searchQuery[key] = filters[key];
                    } else if (Array.isArray(filters[key])) {
                        searchQuery[key] = { $in: filters[key] };
                    } else if (typeof filters[key] === 'object' && filters[key].from && filters[key].to) {
                        // فلتر التاريخ
                        searchQuery[key] = {
                            $gte: new Date(filters[key].from),
                            $lte: new Date(filters[key].to)
                        };
                    } else {
                        searchQuery[key] = filters[key];
                    }
                }
            });
        }

        // بناء الترتيب
        const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
        const sortObject = { [sortBy]: sortDirection };

        // تنفيذ الاستعلام
        let queryBuilder = model.find(searchQuery);

        // إضافة الترتيب
        queryBuilder = queryBuilder.sort(sortObject);

        // إضافة التحديد (select)
        if (select) {
            queryBuilder = queryBuilder.select(select);
        }

        // إضافة الربط (populate)
        if (populate) {
            if (typeof populate === 'string') {
                queryBuilder = queryBuilder.populate(populate);
            } else if (Array.isArray(populate)) {
                populate.forEach(pop => {
                    queryBuilder = queryBuilder.populate(pop);
                });
            } else {
                queryBuilder = queryBuilder.populate(populate);
            }
        }

        // تطبيق الباجينيشن
        const results = await queryBuilder.skip(skip).limit(limitNumber);

        // حساب العدد الإجمالي
        const totalCount = await model.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalCount / limitNumber);

        // معلومات الباجينيشن
        const pagination = {
            currentPage: pageNumber,
            totalPages,
            totalCount,
            limit: limitNumber,
            hasNextPage: pageNumber < totalPages,
            hasPrevPage: pageNumber > 1,
            nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
            prevPage: pageNumber > 1 ? pageNumber - 1 : null,
            skip,
            startIndex: skip + 1,
            endIndex: Math.min(skip + limitNumber, totalCount)
        };

        return {
            status: httpStatusText.SUCCESS,
            data: results,
            pagination,
            search: {
                query: search,
                fields: searchFields
            },
            sort: {
                field: sortBy,
                order: sortOrder
            },
            filters: filters
        };

    } catch (error) {
        throw new Error(`خطأ في الباجينيشن: ${error.message}`);
    }
};

/**
 * دالة مساعدة لاستخراج معاملات الباجينيشن من الطلب
 * @param {Object} req - كائن الطلب
 * @returns {Object} - معاملات الباجينيشن
 */
const extractPaginationParams = (req) => {
    const {
        page,
        limit,
        sortBy,
        sortOrder,
        search,
        searchFields,
        ...filters
    } = req.query;

    return {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 8,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc',
        search: search || '',
        searchFields: searchFields ? searchFields.split(',') : [],
        filters: cleanFilters(filters)
    };
};

/**
 * تنظيف الفلاتر من القيم الفارغة
 * @param {Object} filters - الفلاتر
 * @returns {Object} - الفلاتر المنظفة
 */
const cleanFilters = (filters) => {
    const cleaned = {};
    
    Object.keys(filters).forEach(key => {
        const value = filters[key];
        
        if (value !== undefined && value !== null && value !== '') {
            // تحويل القيم المنطقية
            if (value === 'true') {
                cleaned[key] = true;
            } else if (value === 'false') {
                cleaned[key] = false;
            } else if (key.includes('Date') && value) {
                // معالجة التواريخ
                cleaned[key] = new Date(value);
            } else {
                cleaned[key] = value;
            }
        }
    });
    
    return cleaned;
};

/**
 * دالة للبحث المتقدم
 * @param {Object} model - نموذج Mongoose
 * @param {Object} searchCriteria - معايير البحث
 * @param {Object} options - خيارات إضافية
 * @returns {Object} - نتائج البحث
 */
const advancedSearch = async (model, searchCriteria, options = {}) => {
    try {
        const {
            textSearch,
            filters,
            dateRange,
            numericRange,
            ...paginationOptions
        } = searchCriteria;

        let query = {};

        // البحث النصي
        if (textSearch && textSearch.query) {
            query.$text = { $search: textSearch.query };
        }

        // الفلاتر العادية
        if (filters) {
            Object.assign(query, filters);
        }

        // فلتر التاريخ
        if (dateRange) {
            Object.keys(dateRange).forEach(field => {
                const range = dateRange[field];
                if (range.from || range.to) {
                    query[field] = {};
                    if (range.from) query[field].$gte = new Date(range.from);
                    if (range.to) query[field].$lte = new Date(range.to);
                }
            });
        }

        // فلتر الأرقام
        if (numericRange) {
            Object.keys(numericRange).forEach(field => {
                const range = numericRange[field];
                if (range.min !== undefined || range.max !== undefined) {
                    query[field] = {};
                    if (range.min !== undefined) query[field].$gte = range.min;
                    if (range.max !== undefined) query[field].$lte = range.max;
                }
            });
        }

        return await paginate(model, query, { ...options, ...paginationOptions });

    } catch (error) {
        throw new Error(`خطأ في البحث المتقدم: ${error.message}`);
    }
};

/**
 * دالة لإنشاء رابط الصفحة التالية/السابقة
 * @param {Object} req - كائن الطلب
 * @param {number} page - رقم الصفحة
 * @returns {string} - رابط الصفحة
 */
const createPageUrl = (req, page) => {
    const url = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`);
    url.searchParams.set('page', page);
    return url.toString();
};

/**
 * إضافة روابط الباجينيشن للاستجابة
 * @param {Object} req - كائن الطلب
 * @param {Object} pagination - معلومات الباجينيشن
 * @returns {Object} - روابط الباجينيشن
 */
const addPaginationLinks = (req, pagination) => {
    const links = {
        self: createPageUrl(req, pagination.currentPage),
        first: createPageUrl(req, 1),
        last: createPageUrl(req, pagination.totalPages)
    };

    if (pagination.hasNextPage) {
        links.next = createPageUrl(req, pagination.nextPage);
    }

    if (pagination.hasPrevPage) {
        links.prev = createPageUrl(req, pagination.prevPage);
    }

    return links;
};

module.exports = {
    paginate,
    extractPaginationParams,
    cleanFilters,
    advancedSearch,
    createPageUrl,
    addPaginationLinks
};
