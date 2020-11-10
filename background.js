console.log("background loaded")

let enabled = true
let disableNext = false
let ctxMenu = null

// fired when user try to access hatena bookmark page
// check url and redirect if necessary.
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (!tick()) return

        const target = extractTargetFromHatena(details.url)
        console.log(`${details.url}\n-> ${target}`)
        if (target) {
            return {
                "redirectUrl": target
            }
        }
    },
    {
        urls: [ "*://b.hatena.ne.jp/entry*" ]
    },
    [ "blocking" ]
)

// fired when extension icon is clicked
// toggle disableNext
chrome.browserAction.onClicked.addListener(
    () => toggleDisableNext()
)

// register context menu
updateContextMenu()

function isEnabled() {
    return !disableNext && enabled
}

function tick() {
    const ret = isEnabled()
    toggleDisableNext(false)
    return ret
}

function toggleEnabled() {
    enabled = !enabled
    updateIcon()
    updateContextMenu()
}

function toggleDisableNext(forceValue) {
    disableNext = (forceValue !== undefined) ? forceValue : !disableNext
    updateIcon()
}

function updateIcon() {
    console.log(`${isEnabled() ? "enabled" : "disabled"} (disableNext: ${disableNext}, globalEnabled: ${enabled})`)
    chrome.browserAction.setIcon({
        path: isEnabled() ? "assets/icon-32.png" : "assets/icon-disabled-32.png"
    })
}

function updateContextMenu() {
    const ctxMenuOpts = {
        title: enabled ? "Disable until browser restart" : "Enable",
        contexts: [ "browser_action" ],
        onclick: toggleEnabled
    }

    if (!ctxMenu) {
        ctxMenu = chrome.contextMenus.create(ctxMenuOpts)
    } else {
        chrome.contextMenus.update(ctxMenu, ctxMenuOpts)
    }
}

function extractTargetFromHatena(urlstr) {
    let target = ""
    const url = new URL(urlstr)
    const urlParam = url.searchParams.get("url")

    if (urlParam) {
        // if url has a query parameter 'url', decode and use them.
        target = decodeURIComponent(urlParam)
    } else {
        let path = url.pathname.replace(/^\/entry\//, "")
        let scheme = "http"
        if (path.startsWith("s/")) {
            path = path.replace(/^s\//, "")
            scheme = "https"
        }
        
        target = `${scheme}://${path}${url.search}`
    }

    return target
}
