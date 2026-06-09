V9.2 — API Pointage Salariés

Ajouts :
1. Planning imprimable joli pour les salariés :
   - bouton côté salarié dans Mon planning
   - bouton côté Amar dans Planning > Visuel imprimable

2. Affectation / lieu par créneau :
   - Bâtiment pro
   - Stade Vélodrome
   - Déplacement extérieur
   - Site ForOM
   - Site CFO
   - Commanderie
   - Autre site
   - champ précision / affectation

3. Congés remis en fonction pour les salariés non intérimaires :
   - un salarié pose une demande de congé/récupération
   - Amar Lacidi valide ou refuse dans l’onglet manager Demandes CP
   - les intérimaires sont exclus automatiquement si leur nom contient intérim/interim/extra ou si leur rôle est interim

4. SQL à exécuter dans Supabase :
   supabase_planning_v9_2.sql

Notes :
- Le contrôle Amar Lacidi reste côté application.
- Pour un verrouillage RH total, il faudra compléter les règles côté Supabase/RLS.
