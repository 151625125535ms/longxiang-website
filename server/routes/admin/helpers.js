function sendError(res, status, code, message) {
    return res.status(status).json({
        ok: false,
        error: { code, message }
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

module.exports = { sendError, getClientIp, insertAuditLog };
