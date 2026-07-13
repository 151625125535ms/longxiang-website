const FRIENDLY_ERROR_MESSAGES = {
    'Username and password are required.': '请输入用户名和密码。',
    'Invalid username or password.': '用户名或密码不正确。',
    'API endpoint not found.': '接口不存在，请刷新后台后重试。',
    'Admin API endpoint not found.': '后台接口不存在，请刷新后台后重试。',
    'Internal server error.': '服务器暂时无法处理，请稍后重试。',
    'SQLite database is unavailable.': '数据库暂时不可用，请联系网站维护人员。',
    'Product not found.': '没有找到这个产品，可能已被删除或页面数据已过期。',
    'Certification not found.': '没有找到这个证书，可能已被删除或页面数据已过期。',
    'Category not found.': '没有找到这个分类，可能已被删除或页面数据已过期。',
    'Content block not found.': '没有找到这个内容块，请刷新后台后重试。',
    'name_en is required.': '请至少填写一个名称。',
    'slug is required.': 'Slug 可自动生成，请填写分类名称后保存。',
    'type must be one of product, certification, content.': '分类类型不正确，请刷新后台后重试。',
    'version is required.': '页面数据已过期，请重新打开后再保存。',
    'Product version conflict.': '这个产品已被更新，请重新加载后再保存。',
    'Certification version conflict.': '这个证书已被更新，请重新加载后再保存。',
    'Content block version conflict.': '这块内容已被更新，请重新加载后再保存。',
    'Invalid status.': '状态值不正确，请刷新后台后重试。',
    'Invalid category.': '分类不正确，请重新选择分类。',
    'Invalid category type.': '分类类型不正确，请刷新后台后重试。',
    'Invalid featured value.': '首页推荐状态不正确，请刷新后台后重试。',
    'Invalid cover_image path.': '图片路径不正确，请使用上传后的图片或资源库中的路径。',
    'Invalid gallery image path.': '图库图片路径不正确，请使用上传后的图片或资源库中的路径。',
    'Gallery supports up to 6 images.': '图库最多添加 6 张图片。',
    'aliases_json must be a JSON string.': '别名数据格式不正确，请刷新后台后重试。',
    'legacy_id or slug already exists.': '产品 ID 或链接已存在，系统已无法自动避让，请换一个名称后再试。',
    'legacy_id already exists.': '证书 ID 已存在，请换一个名称后再试。',
    'Category slug must be unique within the same type.': '分类链接已存在，系统已无法自动避让，请换一个分类名称后再试。',
    'Category is referenced by': '这个分类下还有内容，不能直接删除。',
    'path is required.': '请填写资源路径。',
    'filename is required.': '请填写文件名。',
    'path already exists.': '这个资源路径已经存在。',
    'No file uploaded.': '请选择要上传的文件。',
    'Only jpeg, png, webp, or gif images are allowed.': '只能上传 JPG、PNG、WebP 或 GIF 图片。',
    'Image must be 8MB or smaller.': '图片不能超过 8MB。',
    'ids must be a non-empty array.': '请先选择要操作的数据。',
    'Invalid batch action.': '批量操作类型不正确，请刷新后台后重试。',
    'hard_delete requires payload.confirm === true.': '永久删除需要二次确认。',
    'versionMap is missing id': '页面数据已过期，请刷新列表后重试。',
    'Batch operation failed.': '批量操作失败，请刷新后重试。',
    '版本冲突': '部分数据已被更新，请刷新列表后重试。'
};

function friendlyErrorMessage(message) {
    const text = String(message || '').trim();
    if (!text) return '操作失败，请稍后重试。';

    if (FRIENDLY_ERROR_MESSAGES[text]) return FRIENDLY_ERROR_MESSAGES[text];

    const matchedKey = Object.keys(FRIENDLY_ERROR_MESSAGES).find(function (key) {
        return text.indexOf(key) !== -1;
    });
    return matchedKey ? FRIENDLY_ERROR_MESSAGES[matchedKey] : text;
}

function sendError(res, status, code, message) {
    return res.status(status).json({
        ok: false,
        error: { code, message: friendlyErrorMessage(message) }
    });
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : '';
}

function insertAuditLog(db, req, entityType, entityId, action, beforeValue, afterValue) {
    db.prepare(`
        INSERT INTO audit_logs
            (
                entity_type, entity_id, action, performed_by, request_id,
                before_json, after_json, ip, user_agent, created_at
            )
        VALUES
            (
                @entity_type, @entity_id, @action, @performed_by, @request_id,
                @before_json, @after_json, @ip, @user_agent, @created_at
            )
    `).run({
        entity_type: entityType,
        entity_id: String(entityId),
        action,
        performed_by: req.user && req.user.username ? req.user.username : 'admin',
        request_id: req.headers['x-request-id'] ? String(req.headers['x-request-id']) : null,
        before_json: beforeValue ? JSON.stringify(beforeValue) : null,
        after_json: afterValue ? JSON.stringify(afterValue) : null,
        ip: getClientIp(req),
        user_agent: String(req.headers['user-agent'] || ''),
        created_at: Date.now()
    });
}

module.exports = { sendError, getClientIp, insertAuditLog, friendlyErrorMessage };
