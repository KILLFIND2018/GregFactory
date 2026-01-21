<!DOCTYPE html>
<html>
<head>
    <title></title>
    <meta charset="utf-8" />
    <style>
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        canvas#game {
            display: block;
            width: 100vw;
            height: 100vh;
        }
    </style>
</head>
<body>

    <!--
    <div id="app"></div>
    @vite('resources/js/app.js')
    -->
    <canvas id="game"></canvas>

    <div id="#vue-inventory"></div>
    @vite('resources/js/app.js')
    <script src="/js/game_v2.js"></script>
    <script src="/js/test_game.js"></script>



</body>

</html>
