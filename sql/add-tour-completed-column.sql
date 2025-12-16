-- Adicionar coluna para controlar se usuário já fez o tour
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT FALSE;

-- Marcar sua conta como tour completo (já que você já viu)
UPDATE usuarios 
SET tour_completed = TRUE
WHERE email = 'cjotarasteirinhas@hotmail.com';

-- Verificar
SELECT id, email, nome, tour_completed 
FROM usuarios 
LIMIT 5;
