CROCODILE BIRTHDAY GAME V2

Что нового:
- исправлено положение фотографии в рамке pic.png
- фото обрезается внутри отдельной маски и не вылезает за рамку
- анимация речи крокодила
- анимация открытия подарка
- плавное появление рисунка
- кнопка "Перемешать" для подарков
- финальная плашка "Все подарки открыты!"
- kids.json загружается с параметром ?v=2, чтобы браузер реже брал старый кэш

Структура и имена файлов:
assets/static/
  bg.png
  hero.png
  pres_red.png
  pres_green.png
  pres_blue.png
  pic.png
  hellow.mp3
  is_it_for_me.mp3
  thanks.mp3
  bye.mp3

assets/kids/
  kid_1.png
  kid_2.png
  ...
  kid_pr_1.png
  kid_pr_2.png
  ...
  sp_kid_1.mp3
  sp_kid_2.mp3
  ...

Запуск:
python -m http.server 8000
потом открыть http://localhost:8000
