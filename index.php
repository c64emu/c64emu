<!DOCTYPE html>
<html lang="en">
    <head>
        <title>C64 Emulator</title>

        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta http-equiv="Pragma" content="no-cache" />
        <meta http-equiv="Expires" content="0" />

        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <meta http-equiv="content-type" content="text/html; charset=utf-8">

        <link rel="stylesheet" href="node_modules/bootstrap/dist/css/bootstrap.min.css"/>
        <link rel="stylesheet" href="node_modules/@fortawesome/fontawesome-free/css/all.min.css"/>
        <link rel="stylesheet" href="node_modules/codemirror/lib/codemirror.css"/>

        <script src="node_modules/bootstrap/dist/js/bootstrap.bundle.min.js"></script>

        <script src="node_modules/codemirror/lib/codemirror.js"></script>

        <script src="dist/c64emu.min.js?version=<?php echo time();?>"></script>
        <script src="dist/c64asm.min.js?version=<?php echo time();?>"></script>

        <style>
            .CodeMirror {
                font-family: Courier, monospace;
                font-size: 12px;
            }
        </style>

    </head>

    <body>

        <div class="container">
            <br/>
            <!--<canvas id="c64monitor_canvas" width="400" height="280" style="width:800px;">
            </canvas>-->
            <canvas id="c64monitor_canvas" width="400" height="280" style="width:400px;">
            </canvas>
        </div>

        <div class="container">
            <div class="row">
                <div class="col-6 border border-dark mx-0 px-0">
                    <textarea id="editor"></textarea>
                    <button type="button" class="btn btn-primary"
                        onclick="assemble();">Assemble</button>
                    <button type="button" class="btn btn-primary"
                        onclick="run();">Run</button>
                </div>
                <div class="col-6">
                    <span id="machine-code"></span>
                </div>
            </div>
        </div>

        <script>
            let monitor = document.getElementById("c64monitor_canvas");
            c64emu.init(monitor);
            c64emu.render();

            let editorElement = document.getElementById("editor");
            var editor = CodeMirror.fromTextArea(editorElement, {
                lineNumbers: true
            });
            const prog = `; hello world
* = $4000
start
    ldx #$00
next
    lda msg,x
    sta $0400,x
    inx
    cpx #$13
    bne next
    jmp *
msg
    .text "HELLO, WORLD!"
`;
            editor.getDoc().setValue(prog);

            // TODO: put code (including code mirror, ...) into src/ide.ts
            function assemble() {
                console.log("blub")
                let assembler = new c64asm.ASM_MOS6502();
                let src = editor.getDoc().getValue();
                let s='';
                if (assembler.assemble(src)) {
                    const mc = assembler.getMachineCode();
                    for (let i = 0; i < mc.bytes.length; i++) {
                        if (i % 8 == 0)
                            s +=
                                '\n$' +
                                (mc.startAddress + i)
                                    .toString(16)
                                    .padStart(4, '0')
                                    .toUpperCase() +
                                ': ';
                        s += mc.bytes[i].toString(16).padStart(2, '0').
                            toUpperCase() + ' ';
                    }
                    s = s.trim();
                } else {
                    s = 'assemble failed. <br/>Error:'
                        + assembler.getErrorString().replace(/\n/g,'<br/>');
                }
                document.getElementById('machine-code').innerHTML =
                    '<code>' + s.replace(/\n/g,'<br/>') + '</code>';
            }

        </script>

        <script>
            // tooltip handling
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
            function hide_tooltips() {
                for(let tooltip of tooltipList)
                    tooltip.hide();
            }
        </script>

        <script>
            // audio test
            /*let audioContext = new (window.AudioContext || window.webkitAudioContext)();
            let mainGainNode = null;
            let noteFreq = null;
            let customWaveform = null;
            let sineTerms = null;
            let cosineTerms = null;

            mainGainNode = audioContext.createGain();
            mainGainNode.connect(audioContext.destination);
            mainGainNode.gain.value = 0.5;

            sineTerms = new Float32Array([0, 0, 1, 0, 1]);
            cosineTerms = new Float32Array(sineTerms.length);
            customWaveform = audioContext.createPeriodicWave(cosineTerms, sineTerms);
            function playTone(freq) {
                let osc = audioContext.createOscillator();
                osc.connect(mainGainNode);
                osc.setPeriodicWave(customWaveform);
                osc.frequency.value = freq;
                osc.start();
                return osc;
            }
            let osc = playTone(100);
            function stopTone() {
                osc.stop();
            }
            window.setTimeout(stopTone, 500);*/

        </script>

    </body>

</html>
