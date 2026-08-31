import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace report type rendering
content = re.sub(r'<strong>Type:</strong> \{report.report_type\}', r'<strong>Type:</strong> {t("incident_" + report.report_type.toLowerCase())}', content)

# Replace severity rendering
content = re.sub(r'<strong>Severity:</strong> \{report.severity\}', r'<strong>Severity:</strong> {t("tier_" + report.severity.toLowerCase())}', content)

# Replace reporter role rendering
content = re.sub(r'\{report.reporter_role.replace\(''.'', '' ''\)\}', r'{t("role_" + report.reporter_role.toLowerCase())}', content)
content = re.sub(r"\{report.reporter_role === 'OFFICIAL' \? '? OFFICIAL' : '? FIELD RESPONDER'\}", r'{report.reporter_role === "OFFICIAL" ? "? " + t("role_official") : "? " + t("role_field_responder")}', content)

# Replace SOS Status rendering
content = re.sub(r'<strong>Status:</strong> \{alert.status\}', r'<strong>Status:</strong> {t("status_" + alert.status.toLowerCase())}', content)

# Replace Vehicle Status rendering
content = re.sub(r'\{v.status\}', r'{t("status_" + v.status.toLowerCase())}', content)
content = re.sub(r'\{veh.status\}', r'{t("status_" + veh.status.toLowerCase())}', content)

# Replace Request Status rendering
content = re.sub(r'<div className="card-badge .*?">\{req.status\}</div>', r'<div className={card-badge card-badge-}>{t("status_" + req.status.toLowerCase())}</div>', content)

# Replace Request Priority rendering
content = re.sub(r'\{req.priority\}', r'{t("tier_" + req.priority.toLowerCase())}', content)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
