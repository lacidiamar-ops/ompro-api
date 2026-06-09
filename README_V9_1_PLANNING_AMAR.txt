V9.1 - Planning salarié réservé à Amar Lacidi

Changements :
- L'onglet Manager > Planning est visible uniquement si l'utilisateur connecté est un manager dont le nom contient Amar Lacidi.
- Les fonctions générer / enregistrer / exporter le planning sont protégées côté interface.
- Les salariés disposent uniquement de la vue Planning : consultation des horaires renseignés.
- Le bouton de validation salarié a été remplacé par un bloc informatif.

À faire dans Supabase :
- Exécuter supabase_planning_v9.sql si ce n'est pas déjà fait.

Attention : la restriction est appliquée côté application. Pour une sécurité RH stricte, il faudra aussi ajouter une vraie authentification Supabase/RLS ou une règle serveur.
