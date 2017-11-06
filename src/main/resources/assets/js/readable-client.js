(function (global) {

    var cvDocument = cv_getDocument();
    var expanded = false;
    var uid = cvDocument.baseURI.split('?uid=')[1];
    if (uid.indexOf('&') > -1) {
        uid = uid.split('&')[0];
    }

    document.onclick = myClickHandler;

    function myClickHandler(e) {
        if (e.target.classList.contains("expand-trigger")){
            console.log("class hit detected on : " + e.target.className);
            var target = e.target.parentNode.nextElementSibling;
            console.log(target.className);
            // if (target.className == "expandable"){
            if (target.classList.contains("expandable")){
                if (target.style.display == "table-row"){
                    target.style.display = "none";
                } else {
                    target.style.display = "table-row";
                }
           }
        } else if (e.target.className == "pure-button"){
            var expandableDivs = document.getElementsByClassName("expandable pure-table");
            console.log(expanded);
            var target;
            var targetDisplayStyle;
            // var currentDisplay;
            if (expanded){
                targetDisplayStyle = "none";
            } else {
                targetDisplayStyle = "table-row";
            }

            for (var i = 0; i < expandableDivs.length; i++){
                expandableDivs[i].style.display = targetDisplayStyle;
            }
            expanded = !expanded;
        }
    }

    global.Readable = {

        cv_branchToggle: function (branch) {
            var container = getContainer('readableid'),
                otherBranch = (branch == "master" ? "draft" : "master");

            if (container.querySelector("#" + branch).style.display == "none") {
                container.querySelector("#" + branch).style.display = "block";
                container.querySelector("#tab_" + branch).classList.toggle("selected");

                container.querySelector("#" + otherBranch).style.display = "none";
                container.querySelector("#tab_" + otherBranch).classList.toggle("selected");
            }

            return false;
        }
    };

    function cv_getDocument() {
        var script = window.HTMLImports ? window.HTMLImports.currentScript : undefined;

        if (!script && !!document.currentScript) {
            script = document.currentScript.__importElement || document.currentScript;
        }

        return script ? script.ownerDocument : document;
    }

    function getContainer(containerId) {
        console.log(uid);
        containerId = containerId + "_" + uid;
        return document.getElementById(containerId) || cvDocument.getElementById(containerId);
    }
}(window));

