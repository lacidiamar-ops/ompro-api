# Sécurité OM PRO API

## Principe retenu

Le fonctionnement actuel par sélection du salarié + code PIN est conservé. Aucune modification de la validation du PIN n'est incluse dans cette étape.

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

## Règle de déploiement

Ne jamais supprimer une politique RLS anonyme tant que l'écran correspondant n'a pas été migré vers une fonction RPC testée. Le contrôle doit être réalisé sur : connexion salarié, pointage, pauses, fin de service, planning, congés, signatures, régularisations, déplacements, météo d'équipe et notifications.

## Étape suivante

Migrer en priorité les modifications de `employees`, `overtime_settings`, `regularization_requests` et `punches` vers des RPC contrôlées. Après validation, retirer uniquement les politiques anonymes d'écriture correspondantes. La lecture nécessaire à l'écran de connexion pourra rester disponible via une vue limitée ne contenant ni PIN ni donnée RH confidentielle.
