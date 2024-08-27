/**
 * Listens for actions related to the input methods (clipboard paste, file drag/drop, file chooser browser, url list submit)
 *
 * Initiates Tesseract OCR on each image and inserts results back into the page.
 */
(function () {
    'use strict';

    // Increment for each image
    let uniqueId = 0;

    /**
     * @param type URL, Clipboard, File
     * @returns {string}
     */
    function buildAndAddResultHtml(type, typeInfo) {
        const id = uniqueId++;

        const html = `
                <div class="result loading mb-3" id="result-${id}">
                    <strong>${type}</strong>
                    <input autocomplete="off" type="text" class="form-control" value="${typeInfo}" readonly>
                    <br>
                    <div class="row">
                        <div class="col-auto text-sm-center">
                            <div class='img-holder'>
                                <img class="input">
                            </div>
                            <small class="image-size text-muted"></small>
                        </div>
                        <div class="col">
                            <textarea autocomplete="off" class='form-control output' rows="8" spellcheck="true" style="width:100%"></textarea>
                        </div>
                    </div>
                    <div class="spinner">
                        <div class="spinner-grow text-primary" role="status">
                          <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
        `

        $("#results").prepend(html);
        $("#placeholder").hide();

        return id;
    }

    /**
     * Do the OCR
     */
    async function translateImgSrc(src, resultElement, outputElement) {
        console.log("translating image");

        const worker = await Tesseract.createWorker();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        const {data} = await worker.recognize(src);

        console.log(data);

        outputElement.text(data.text);
        resultElement.removeClass("loading");
    }

    function loadAsFile(image, method, methodInfo) {
        const id = buildAndAddResultHtml("File (" + method + ")", methodInfo);

        const result = $("#result-" + id);
        const input = result.find(".input");
        const inputSize = result.find(".image-size");
        const output = result.find(".output");

        const reader = new FileReader();
        reader.onload = function (e) {
            input.attr("src", e.target.result);
            input.on("load", function () {
                const temp = new Image();
                temp.onload = function () {
                    inputSize.text(temp.width + "x" + temp.height);

                    translateImgSrc(temp.src, result, output);
                };
                temp.src = input.attr("src");
            });
        };
        reader.readAsDataURL(image);
    }

    function loadAsURL(url) {
        const id = buildAndAddResultHtml("URL", url);

        const result = $("#result-" + id);
        const input = result.find(".input");
        const inputSize = result.find(".image-size");
        const output = result.find(".output");

        translateImgSrc(url, result, output);

        input.attr("src", url);

        const temp = new Image();
        temp.onload = function () {
            inputSize.text(temp.width + "x" + temp.height);
        };
        temp.src = url;
    }

    // Wait for the page to finish loading before we attach listeners
    $(document).ready(function () {

        // Drag & Drop listener
        document.body.addEventListener('dragenter', async function () {
            $('.selector').css({'border' : '3px dashed cornflowerblue'});
        })
        document.body.addEventListener('dragleave', async function (e) {
            if (e.target === document.body) {
                $('.selector').css({'border' : ''});
            }
        })
        document.body.addEventListener('drop', async function (e) {
            e.stopPropagation();
            e.preventDefault();

            let file = e.dataTransfer.files[0];
            console.log("loading file");
            console.log(file);

            loadAsFile(file, "Drag/Drop", file.name);

            $('.selector').css({'border' : ''});
        });

        // Clipboard paste listener
        document.onpaste = function (e) {
            const items = e.clipboardData.items;

            for (let i = 0; i < items.length; i++) {
                if (/^image\/(p?jpeg|gif|png)$/i.test(items[i].type)) {
                    const file = items[i].getAsFile();

                    loadAsFile(file, "Clipboard", new Date().toISOString());

                    e.preventDefault();
                    return;
                }
            }
        };

        // File chooser listener
        $("#file-chooser").change(function (e) {
            const files = e.target.files;

            for (let i = 0; i < files.length; i++) {
                loadAsFile(files[i], "Browse", files[i].name);
            }
        });

        $("#url-submit").on('click', function () {
            const text = $("#url-list").val();

            if (text) {
                const urls = text.split("\n");

                for (let i = 0; i < urls.length; i++) {
                    const url = urls[i].trim();
                    try {
                        new URL(url);
                        // Valid URL

                        loadAsURL(url);
                    } catch (_) {
                        // Invalid URL
                        console.log("invalid url " + url)
                    }
                }
            } else {
                console.log("urls input was empty")
            }
        });
    });
})();
