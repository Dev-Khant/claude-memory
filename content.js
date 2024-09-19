let isProcessingMem0 = false;

function addMem0Button() {
    const sendButton = document.querySelector('button[aria-label="Send Message"]');
    const screenshotButton = document.querySelector('button[aria-label="Capture screenshot"]');

    if (window.location.href.includes('claude.ai/new') && screenshotButton && !document.querySelector('#mem0-button')) {
        const mem0Button = document.createElement('button');
        mem0Button.id = 'mem0-button';
        mem0Button.className = screenshotButton.className;
        mem0Button.style.marginLeft = '6px';
        mem0Button.setAttribute('aria-label', 'Add related memories');

        const mem0Icon = document.createElement('img');
        mem0Icon.src = chrome.runtime.getURL('icons/mem0-claude-icon.png');
        mem0Icon.style.width = '16px';
        mem0Icon.style.height = '16px';

        mem0Button.appendChild(mem0Icon);
        mem0Button.addEventListener('click', handleMem0Click);

        const tooltip = document.createElement('div');
        tooltip.id = 'mem0-tooltip';
        tooltip.textContent = 'Add related memories';
        tooltip.style.cssText = `
            display: none;
            position: fixed;
            background-color: black;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
            white-space: nowrap;
            transform: translateX(-50%);
        `;
        document.body.appendChild(tooltip);

        mem0Button.addEventListener('mouseenter', (event) => {
            console.log('Mouse entered Mem0 button');
            const rect = mem0Button.getBoundingClientRect();
            const buttonCenterX = rect.left + rect.width / 2;
            tooltip.style.left = `${buttonCenterX}px`;
            tooltip.style.top = `${rect.bottom + 5}px`;
            tooltip.style.display = 'block';
        });

        mem0Button.addEventListener('mouseleave', () => {
            console.log('Mouse left Mem0 button');
            tooltip.style.display = 'none';
        });

        screenshotButton.parentNode.insertBefore(mem0Button, screenshotButton.nextSibling);
    } else if (sendButton && !document.querySelector('#mem0-button')) {

        const buttonContainer = document.createElement('div');
        buttonContainer.style.position = 'relative';
        buttonContainer.style.display = 'inline-block';

        const mem0Button = document.createElement('img');
        mem0Button.id = 'mem0-button';
        mem0Button.src = chrome.runtime.getURL('icons/mem0-claude-icon.png');
        mem0Button.style.width = '18px';
        mem0Button.style.height = '18px';
        mem0Button.style.marginRight = '22px';
        mem0Button.style.cursor = 'pointer';
        mem0Button.style.padding = '6px';
        mem0Button.style.borderRadius = '5px';
        mem0Button.style.transition = 'background-color 0.3s ease, transform 0.2s ease';
        mem0Button.style.boxSizing = 'content-box';
        mem0Button.addEventListener('click', handleMem0Click);

        mem0Button.addEventListener('mouseenter', () => {
            mem0Button.style.backgroundColor = 'rgba(0, 0, 0, 0.35)';
            tooltip.style.visibility = 'visible';
            tooltip.style.opacity = '1';
        });
        mem0Button.addEventListener('mouseleave', () => {
            mem0Button.style.backgroundColor = 'transparent';
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '0';
        });

        const tooltip = document.createElement('div');
        tooltip.textContent = 'Add related memories';
        tooltip.style.visibility = 'hidden';
        tooltip.style.backgroundColor = 'black';
        tooltip.style.color = 'white';
        tooltip.style.textAlign = 'center';
        tooltip.style.borderRadius = '4px';
        tooltip.style.padding = '3px 6px';
        tooltip.style.position = 'absolute';
        tooltip.style.zIndex = '1';
        tooltip.style.top = 'calc(100% + 5px)';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.3s';
        tooltip.style.fontSize = '12px';

        buttonContainer.appendChild(mem0Button);
        buttonContainer.appendChild(tooltip);

        const flexContainer = document.createElement('div');
        flexContainer.style.display = 'flex';
        flexContainer.style.alignItems = 'center';

        sendButton.parentNode.insertBefore(flexContainer, sendButton);
        flexContainer.appendChild(buttonContainer);
        flexContainer.appendChild(sendButton);
    }
}

async function handleMem0Click() {
    const inputElement = document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
    const message = getInputValue();
    if (!message) {
        console.error('No input message found');
        return;
    }

    if (isProcessingMem0) {
        console.log('Mem0 processing is already in progress');
        return;
    }

    isProcessingMem0 = true;

    try {
        chrome.storage.sync.get(['apiKey', 'userId'], async function(data) {
            const apiKey = data.apiKey;
            const userId = data.userId || 'claude-user';

            const searchResponse = await fetch('https://api.mem0.ai/v1/memories/search/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${apiKey}`
                },
                body: JSON.stringify({ query: message, user_id: userId, rerank: true, threshold: 0.1, limit: 10 })
            });

            fetch('https://api.mem0.ai/v1/memories/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${apiKey}`
                },
                body: JSON.stringify({
                    messages: [{ content: message, role: 'user' }],
                    user_id: userId,
                    infer: true
                })
            }).then(response => {
                if (!response.ok) {
                    console.error('Failed to add memory:', response.status);
                }
            }).catch(error => {
                console.error('Error adding memory:', error);
            });

            if (!searchResponse.ok) {
                throw new Error(`API request failed with status ${searchResponse.status}`);
            }

            const responseData = await searchResponse.json();

            if (inputElement) {
                const memories = responseData.map(item => item.memory);

                if (memories.length > 0) {
                    let currentContent = inputElement.tagName.toLowerCase() === 'div' ? inputElement.innerHTML : inputElement.value;

                    const memInfoRegex = /\s*<strong>Here is some more information about me:<\/strong>[\s\S]*$/;
                    currentContent = currentContent.replace(memInfoRegex, '').trim();
                    const endIndex = currentContent.indexOf('</p>');
                    if (endIndex !== -1) {
                        currentContent = currentContent.slice(0, endIndex+4);
                    }

                    const memoryWrapper = document.createElement('div');
                    memoryWrapper.id = "mem0-wrapper";
                    memoryWrapper.style.backgroundColor = 'rgb(220, 252, 231)';
                    memoryWrapper.style.padding = '8px';
                    memoryWrapper.style.borderRadius = '4px';
                    memoryWrapper.style.marginTop = '8px';
                    memoryWrapper.style.marginBottom = '8px';

                    const titleElement = document.createElement('strong');
                    titleElement.textContent = 'Here is some more information about me:';
                    memoryWrapper.appendChild(titleElement);

                    memories.forEach(mem => {
                        const memoryItem = document.createElement('div');
                        memoryItem.textContent = `- ${mem}`;
                        memoryWrapper.appendChild(memoryItem);
                    });

                    const memoryTextWithStyle = memoryWrapper.outerHTML;

                    if (inputElement.tagName.toLowerCase() === 'div') {
                        inputElement.innerHTML = `${currentContent}<div><br></div>${memoryTextWithStyle}`;
                    } else {
                        inputElement.value = `${currentContent}\n${memoryTextWithStyle}`;
                    }

                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                }
            } else {
                console.log('Mem0 response:', responseData || 'No response received');
                alert('Mem0 response received, but no input field found to update.');
            }
        });
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to send message to Mem0: ' + error.message);
    } finally {
        isProcessingMem0 = false;
    }
}

function getInputValue() {
    const inputElement = document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
    return inputElement ? inputElement.textContent || inputElement.value : null;
}

function initializeMem0Integration() {
    addMem0Button();

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                addMem0Button();
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

initializeMem0Integration();
