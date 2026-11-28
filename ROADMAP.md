# Roadmap

## Прототип (зараз)
- [x] Каркас: Vite + React + TypeScript
- [x] Головна: картки курсів з content/courses.json
- [x] Сторінка курсу: пронумерований список завдань, статуси, XP
- [x] Теоретичний блок перед завданням (поле `theory`, кнопка «До завдання»)
- [x] Екран завдання: умова, перевірка, підказка, розбір
- [x] Типи завдань: multi-choice, find-in-code, text-answer, pick-email
- [x] Інтерактивні типи: inbox-triage, scenario, password-lab, injection-sandbox, fill-slots, cipher-lab, hash-check
- [x] XP, рівень і прогрес у localStorage
- [x] Кнопка «Скинути прогрес»
- [x] Практичні завдання для демо: по 3 на курс (secure-dev, cyber-hygiene, cryptology)
- [x] Деплой статичним сайтом
- [x] Курс «Захист критичної інфраструктури» (critical-infra): 11 модулів, 40 завдань, посади за XP курсу
- [x] Нові типи: ordering, matching, sort-bins, packet-filter (симулятор ACL/МЕ), incident-sim (сценарій з показниками), cli-console (міні-консоль Cisco IOS); `variant` у find-in-code
- [x] Групування завдань за модулями (поле `module`), ранги курсу (поле `ranks`)
- [x] Тести: `npm test` (симулятор ACL, консоль IOS, розв'язуваність контенту)

## Потім
- Курс Cisco (механіки вже є: ordering, matching, cli-console)
- risk-matrix – оцінка загроз на сітці «ймовірність × наслідки»
- Бекенд, анонімні ID учасників, логування спроб і підказок
- Тести до і після, форма згоди (етичний протокол)
- Бейджі, серії днів, рейтинги
- Академічна доброчесність як окрема тема
