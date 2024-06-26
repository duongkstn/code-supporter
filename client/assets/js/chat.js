const query = (obj) => Object.keys(obj).map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(obj[k])).join("&");
const markdown = window.markdownit();
const message_box = document.getElementById(`messages`);
const message_input = document.getElementById(`message-input`);
const box_conversations = document.querySelector(`.top`);
const spinner = box_conversations.querySelector(".spinner");
const stop_generating = document.querySelector(`.stop_generating`);
const send_button = document.querySelector(`#send-button`);
let prompt_lock = false;
let messages = [];

var model = "gpt-3.5-turbo-16k";
var query_or_feedback = "Query";
var custom_url = document.getElementById(`url-input`).value;

// Add event listeners
document.addEventListener("DOMContentLoaded", function() {
    var modelSelect = document.getElementById(`model`);

    modelSelect.addEventListener("change", function() {
        model = modelSelect.options[modelSelect.selectedIndex].value;
        console.log('Model value changed to: ' + model);
    });
});

const save_url_button = document.querySelector(`#save-url-button`);
save_url_button.addEventListener(`click`, async () => {
    console.log("clicked save url");
    document.getElementById(`save-url-button-i`).className = "fa-regular fa-check"
    custom_url = document.getElementById(`url-input`).value;
    document.getElementById(`url-input`).disabled = true;
});


document.addEventListener("DOMContentLoaded", function() {
    var queryfeedbackSelect = document.getElementById(`query_or_feedback`);

    queryfeedbackSelect.addEventListener("change", function() {
        query_or_feedback = queryfeedbackSelect.options[queryfeedbackSelect.selectedIndex].value;
        if (query_or_feedback === "Query") { 
            document.getElementById(`message-input`).placeholder = "Ask me anything..."; 
        } else {
            document.getElementById(`message-input`).placeholder = "Please give me a feedback..."; 
        }
    });
});



hljs.addPlugin(new CopyButtonPlugin());

function resizeTextarea(textarea) {
    textarea.style.height = '80px';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

const format = (text) => {
    // return text.replace(/(?:\r\n|\r|\n)/g, "<br>");
    return text;
};
const clean = (text) => {
    text = text.replaceAll("&lt;", "<").replaceAll("&gt;", ">");
    return text;
};

message_input.addEventListener("blur", () => {
    window.scrollTo(0, 0);
});

const delete_conversations = async () => {
    const confirmed = confirm("Are you sure you want to delete all conversations?");
    if (confirmed) {
        localStorage.clear();
        await new_conversation();
    }
};

const handle_ask = async () => {
    message_input.style.height = `80px`;
    message_input.focus();

    window.scrollTo(0, 0);
    let message = message_input.value;

    if (message.length > 0) {
        message_input.value = ``;
        await ask_gpt(message);
    }
};

const remove_cancel_button = async () => {
    stop_generating.classList.add(`stop_generating-hiding`);

    setTimeout(() => {
        stop_generating.classList.remove(`stop_generating-hiding`);
        stop_generating.classList.add(`stop_generating-hidden`);
    }, 300);
};

const ask_gpt = async (message) => {
    try {
        message_input.value = ``;
        message_input.innerHTML = ``;
        message_input.innerText = ``;

        add_conversation(window.conversation_id, message.substr(0, 20));
        window.scrollTo(0, 0);
        window.controller = new AbortController();

        prompt_lock = true;
        window.text = ``;
        window.token = message_id();

        stop_generating.classList.remove(`stop_generating-hidden`);

        message_box.innerHTML += `
            <div class="message">
                <div class="user">
                    ${user_image}
                    <i class="fa-regular"></i>
                </div>
                <div class="content" id="user_${token}"> 
                    ${format(message)}
                </div>
            </div>
        `;

        document.querySelectorAll('code:not(p code):not(li code)').forEach((el) => {
            hljs.highlightElement(el);
            el.classList.add('processed');
        });

        message_box.scrollTo({
            top: message_box.scrollHeight,
            behavior: "smooth"
        });
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 500));
        window.scrollTo(0, 0);

        message_box.innerHTML += `
            <div class="message">
                <div class="user">
                    ${gpt_image} <i class="fa-regular"></i>
                </div>
                <div class="content" id="gpt_${window.token}">
                    <div id="cursor"></div>
                </div>
            </div>
        `;

        message_box.scrollTo({
            top: message_box.scrollHeight,
            behavior: "smooth"
        });
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 1000));
        window.scrollTo(0, 0);

        window.scrollTo(0, 0);
		message_box.scrollTo({
			top: message_box.scrollHeight,
			behavior: "auto"
		});

        add_message(window.conversation_id, "user", message);
        if (query_or_feedback === "Query") {
            messages.push({
                "role": "user",
                "content": message
            });
        }
        const ws = new WebSocket('ws://0.0.0.0:7999/ws');
        ws.onopen = () => {
            console.log("onopen", custom_url);
            document.getElementById(`gpt_${window.token}`).innerHTML = markdown.render("");
            send_data = {
                "model": model,
                "custom_url": custom_url,
                "messages": messages,
                
            }
            if (query_or_feedback === "Feedback") {
                send_data["feedback"] = message
            }
            send_data = JSON.stringify(send_data)
            console.log("send_data", send_data)
            ws.send(send_data);
            
        };
        

        ws.onmessage = function(event) {
            // console.log("onmessage");
            // Append incoming bot message
            output_ws = JSON.parse(event.data);
            console.log("output_ws", output_ws);
            if (output_ws["type"] === "token") {
                document.getElementById(`gpt_${window.token}`).innerHTML += output_ws["text"];
            } else if (output_ws["type"] === "exit_token") {  //exit_token
                console.log("output = ", clean(document.getElementById(`gpt_${window.token}`).innerHTML));
                add_message(window.conversation_id, "assistant", clean(document.getElementById(`gpt_${window.token}`).innerHTML));
                document.getElementById(`gpt_${window.token}`).innerHTML = markdown.render(clean(document.getElementById(`gpt_${window.token}`).innerHTML));
                messages.push({
                    "role": "assistant",
                    "content": document.getElementById(`gpt_${window.token}`).innerHTML
                })
                document.querySelectorAll('code:not(p code):not(li code)').forEach((el) => {
                    hljs.highlightElement(el);
                    el.classList.add('processed');
                });
            } else { //feedback
                console.log("refined feedback = ", output_ws["text"])
                messages.push({
                    "role": "user",
                    "content": output_ws["text"]
                })
            }
        };


    
		
        

        message_box.scrollTop = message_box.scrollHeight;
        await remove_cancel_button();
        prompt_lock = false;

        await load_conversations(20, 0);
        window.scrollTo(0, 0);
    } catch (e) {
        add_message(window.conversation_id, "user", message);

        message_box.scrollTop = message_box.scrollHeight;
        await remove_cancel_button();
        prompt_lock = false;

        await load_conversations(20, 0);

        console.log(e);

        let cursorDiv = document.getElementById(`cursor`);
        if (cursorDiv) cursorDiv.parentNode.removeChild(cursorDiv);

        if (e.name != `AbortError`) {
            let error_message = `Oops ! Something went wrong, please try again later. Check error in console.`;

            document.getElementById(`gpt_${window.token}`).innerHTML = error_message;
            add_message(window.conversation_id, "assistant", error_message);
        } else {
            document.getElementById(`gpt_${window.token}`).innerHTML += ` [aborted]`;
            add_message(window.conversation_id, "assistant", text + ` [aborted]`);
        }

        window.scrollTo(0, 0);
    }
};
const clear_conversations = async () => {
    const elements = box_conversations.childNodes;
    let index = elements.length;

    if (index > 0) {
        while (index--) {
            const element = elements[index];
            if (
                element.nodeType === Node.ELEMENT_NODE &&
                element.tagName.toLowerCase() !== `button`
            ) {
                box_conversations.removeChild(element);
            }
        }
    }
};

const clear_conversation = async () => {
    let messages = message_box.getElementsByTagName(`div`);

    while (messages.length > 0) {
        message_box.removeChild(messages[0]);
    }
};

const show_option = async (conversation_id) => {
    const conv = document.getElementById(`conv-${conversation_id}`);
    const yes = document.getElementById(`yes-${conversation_id}`);
    const not = document.getElementById(`not-${conversation_id}`);

    conv.style.display = "none";
    yes.style.display = "block";
    not.style.display = "block";
}

const hide_option = async (conversation_id) => {
    const conv = document.getElementById(`conv-${conversation_id}`);
    const yes = document.getElementById(`yes-${conversation_id}`);
    const not = document.getElementById(`not-${conversation_id}`);

    conv.style.display = "block";
    yes.style.display = "none";
    not.style.display = "none";
}

const delete_conversation = async (conversation_id) => {
    localStorage.removeItem(`conversation:${conversation_id}`);

    const conversation = document.getElementById(`convo-${conversation_id}`);
    conversation.remove();

    if (window.conversation_id == conversation_id) {
        await new_conversation();
    }

    await load_conversations(20, 0, true);
};

const set_conversation = async (conversation_id) => {
    window.conversation_id = conversation_id;

    await clear_conversation();
    await load_conversation(conversation_id);
    await load_conversations(20, 0, true);
};

const new_conversation = async () => {
    window.conversation_id = uuid();
    messages = []

    await clear_conversation();
    await load_conversations(20, 0, true);
    
};

const load_conversation = async (conversation_id) => {
    let conversation = await JSON.parse(
        localStorage.getItem(`conversation:${conversation_id}`)
    );
    console.log("JJJJ", conversation, conversation_id);
    messages = conversation["items"];

    for (item of conversation.items) {
        message_box.innerHTML += `
            <div class="message">
                <div class="user">
                    ${item.role == "assistant" ? gpt_image : user_image}
                    ${
                      item.role == "assistant"
                        ? `<i class="fa-regular"></i>`
                        : `<i class="fa-regular"></i>`
                    }
                </div>
                <div class="content">
                    ${
                      item.role == "assistant"
                        ? markdown.render(item.content)
                        : item.content
                    }
                </div>
            </div>
        `;
    }

    document.querySelectorAll('code:not(p code):not(li code)').forEach((el) => {
        hljs.highlightElement(el);
        el.classList.add('processed');
    });

    message_box.scrollTo({
        top: message_box.scrollHeight,
        behavior: "smooth"
    });

    setTimeout(() => {
        message_box.scrollTop = message_box.scrollHeight;
    }, 500);
};

const get_conversation = async (conversation_id) => {
    let conversation = await JSON.parse(
        localStorage.getItem(`conversation:${conversation_id}`)
    );
    return conversation.items;
};

const add_conversation = async (conversation_id, title) => {
    if (localStorage.getItem(`conversation:${conversation_id}`) == null) {
        localStorage.setItem(
            `conversation:${conversation_id}`,
            JSON.stringify({
                id: conversation_id,
                title: title,
                items: [],
            })
        );
    }
};

const add_message = async (conversation_id, role, content) => {
    before_adding = JSON.parse(
        localStorage.getItem(`conversation:${conversation_id}`)
    );

    before_adding.items.push({
        role: role,
        content: content,
    });

    localStorage.setItem(
        `conversation:${conversation_id}`,
        JSON.stringify(before_adding)
    ); // update conversation
};

const load_conversations = async (limit, offset, loader) => {
    //console.log(loader);
    //if (loader === undefined) box_conversations.appendChild(spinner);

    let conversations = [];
    for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i).startsWith("conversation:")) {
            let conversation = localStorage.getItem(localStorage.key(i));
            conversations.push(JSON.parse(conversation));
        }
    }

    //if (loader === undefined) spinner.parentNode.removeChild(spinner)
    await clear_conversations();
    console.log("conversations", conversations);
    for (conversation of conversations) {
        box_conversations.innerHTML += `
    <div class="convo" id="convo-${conversation.id}">
      <div class="left" onclick="set_conversation('${conversation.id}')">
          <i class="fa-regular fa-comments"></i>
          <span class="convo-title">${conversation.title}</span>
      </div>
      <i onclick="show_option('${conversation.id}')" class="fa-regular fa-trash" id="conv-${conversation.id}"></i>
      <i onclick="delete_conversation('${conversation.id}')" class="fa-regular fa-check" id="yes-${conversation.id}" style="display:none;"></i>
      <i onclick="hide_option('${conversation.id}')" class="fa-regular fa-x" id="not-${conversation.id}" style="display:none;"></i>
    </div>
    `;
    }

    document.querySelectorAll('code:not(p code):not(li code)').forEach((el) => {
        hljs.highlightElement(el);
        el.classList.add('processed');
    });
};

document.getElementById(`cancelButton`).addEventListener(`click`, async () => {
    window.controller.abort();
    console.log(`aborted ${window.conversation_id}`);
});

function h2a(str1) {
    var hex = str1.toString();
    var str = "";

    for (var n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }

    return str;
}

const uuid = () => {
    return `xxxxxxxx-xxxx-4xxx-yxxx-${Date.now().toString(16)}`.replace(
        /[xy]/g,
        function(c) {
            var r = (Math.random() * 16) | 0,
                v = c == "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        }
    );
};

const message_id = () => {
    random_bytes = (Math.floor(Math.random() * 1338377565) + 2956589730).toString(
        2
    );
    unix = Math.floor(Date.now() / 1000).toString(2);

    return BigInt(`0b${unix}${random_bytes}`).toString();
};

window.onload = async () => {
    load_settings_localstorage();

    conversations = 0;
    for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i).startsWith("conversation:")) {
            conversations += 1;
        }
    }

    if (conversations == 0) localStorage.clear();

    await setTimeout(() => {
        load_conversations(20, 0);
    }, 1);

    message_input.addEventListener(`keydown`, async (evt) => {
        if (prompt_lock) return;
        if (evt.keyCode === 13 && !evt.shiftKey) {
            evt.preventDefault();
            console.log('pressed enter');
            await handle_ask();
        } else {
            message_input.style.removeProperty("height");
            message_input.style.height = message_input.scrollHeight + 4 + "px";
        }
    });

    send_button.addEventListener(`click`, async () => {
        console.log("clicked send");
        if (prompt_lock) return;
        await handle_ask();
    });

    register_settings_localstorage();
};

document.querySelector(".mobile-sidebar").addEventListener("click", (event) => {
    const sidebar = document.querySelector(".conversations");

    if (sidebar.classList.contains("shown")) {
        sidebar.classList.remove("shown");
        event.target.classList.remove("rotated");
    } else {
        sidebar.classList.add("shown");
        event.target.classList.add("rotated");
    }

    window.scrollTo(0, 0);
});

const register_settings_localstorage = async () => {
    settings_ids = ["model", "query_or_feedback"];
    settings_elements = settings_ids.map((id) => document.getElementById(id));
    settings_elements.map((element) =>
        element.addEventListener(`change`, async (event) => {
            switch (event.target.type) {
                case "checkbox":
                    localStorage.setItem(event.target.id, event.target.checked);
                    break;
                case "select-one":
                    // localStorage.setItem(event.target.id, event.target.selectedIndex);
                    break;
                default:
                    console.warn("Unresolved element type");
            }
        })
    );
};

const load_settings_localstorage = async () => {
    settings_ids = ["model", "query_or_feedback"];
    settings_elements = settings_ids.map((id) => document.getElementById(id));
    settings_elements.map((element) => {
        if (localStorage.getItem(element.id)) {
            switch (element.type) {
                case "checkbox":
                    element.checked = localStorage.getItem(element.id) === "true";
                    break;
                case "select-one":
                    // element.selectedIndex = parseInt(localStorage.getItem(element.id));
                    break;
                default:
                    console.warn("Unresolved element type");
            }
        }
    });
};
