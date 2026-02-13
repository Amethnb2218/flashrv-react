UPDATE salons SET status = 'APPROVED' WHERE status IS NULL OR status <> 'APPROVED';
