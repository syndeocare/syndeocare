DELETE FROM actors
WHERE
  (auth_subject = 'professional-user-001' AND email = 'aseel@example.com')
  OR (auth_subject = 'clinic-user-001' AND email = 'ops@alnoor.example.com');
