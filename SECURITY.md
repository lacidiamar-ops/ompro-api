# Sécurité OM PRO API

## Principe retenu

Le fonctionnement actuel par sélection du salarié + code PIN est conservé. Le format et le parcours PIN ne sont pas modifiés.

La sécurisation est déployée progressivement afin d'éviter une interruption de la pointeuse :

1. journalisation serveur des écritures sensibles ;
2. vérification du fonctionnement réel de tous les écrans ;
3. remplacement progressif des écritures directes par des fonctions SQL contrôlées ;
4. fermeture des anciennes politiques anonymes, table par table, uniquement après validation.

## Tables auditées

- `employees`
- `punches`
- `employee_planning`
- `employee_leave_requests`
- `employee_week_validations`
- `employee_mood_checks`
- `overtime_settings`
- `push_subscriptions`
- `regularization_requests`
- `time_off`
- `travel_segments`

Les valeurs sensibles liées au PIN, au code manager et aux signatures ne sont pas copiées dans le journal.

## Pointage sécurisé

La fonction `ompro.secure_employee_punch` est disponible côté Supabase. Elle :

- réutilise la validation PIN existante via `employee_login` ;
- accepte uniquement les types de pointage autorisés ;
- calcule la date de service en timezone `Europe/Paris` ;
- empêche les doubles débuts, doubles pauses et reprises incohérentes ;
- verrouille la transaction par salarié et par journée pour éviter les doubles clics simultanés ;
- enregistre le pointage avec la source `secure_rpc` ;
- renvoie une réponse JSON compatible avec le frontend.

L'ancienne politique d'insertion anonyme reste provisoirement en place tant que le frontend de production n'appelle pas exclusivement cette fonction.

## Règle de déploiement

Ne jamais supprimer une politique RLS anonyme tant que l'écran correspondant n'a pas été migré vers une fonction RPC testée. Le contrôle doit être réalisé sur : connexion salarié, pointage, pauses, fin de service, planning, congés, signatures, régularisations, déplacements, météo d'équipe et notifications.

## Étape suivante

Basculer `executeConfirmedPunch()` vers `secure_employee_punch`, tester début, trois pauses, reprise, fin et deuxième mission, puis retirer uniquement la politique anonyme `INSERT` de `punches`. La lecture restera ouverte temporairement jusqu'à la création d'une vue ou d'un RPC de lecture limité.
