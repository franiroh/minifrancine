
import { loadComponents, updateNavbarAuth, updateNavbarCartCount } from './components.js';
import { getUser, supabase } from './api.js';
import { loadCart, getCartCount } from './state.js';
import { escapeHtml } from './utils.js';
import { i18n } from './i18n.js';

let currentUser = null;
let currentConversationId = null;
let conversations = [];

async function init() {
    // 1. Init User State early to prevent flickering
    currentUser = await getUser();

    // 2. Load Navbar/Footer
    await loadComponents(currentUser);

    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Listen for state updates
    window.addEventListener('cart-updated', () => {
        updateNavbarCartCount(getCartCount());
    });

    await loadCart(currentUser);
    updateNavbarCartCount(getCartCount());

    loadConversations();
    setupEventListeners();

    if (window.lucide) window.lucide.createIcons();
}

function setupEventListeners() {
    const btnNew = document.getElementById('btn-new-conversation');
    const modal = document.getElementById('new-conversation-modal');
    const btnCancel = document.getElementById('btn-cancel-new');
    const formNew = document.getElementById('new-conversation-form');

    if (btnNew) {
        btnNew.onclick = () => {
            modal.classList.remove('hidden');
        };
    }

    if (btnCancel) {
        btnCancel.onclick = () => {
            modal.classList.add('hidden');
            formNew.reset();
        };
    }

    if (formNew) {
        formNew.onsubmit = async (e) => {
            e.preventDefault();
            const subject = document.getElementById('new-subject').value;
            const message = document.getElementById('new-message').value;

            await createConversation(subject, message);
            modal.classList.add('hidden');
            formNew.reset();
        };
    }
}

async function loadConversations() {
    const listContainer = document.getElementById('conversations-list');

    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching conversations:', error);
        listContainer.innerHTML = `<p style="text-align:center; padding:20px; color:red;">${i18n.t('messages.error_loading')}</p>`;
        return;
    }

    conversations = data || [];
    renderConversationsList();
}

function renderConversationsList() {
    const listContainer = document.getElementById('conversations-list');
    if (conversations.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; padding:20px;">${i18n.t('messages.no_messages')}</p>`;
        return;
    }

    listContainer.innerHTML = conversations.map(conv => `
        <div class="conversation-item ${currentConversationId === conv.id ? 'active' : ''}" onclick="window.selectConversation('${conv.id}')">
            <div class="conversation-subject">${escapeHtml(conv.subject || i18n.t('messages.no_subject'))}</div>
            <div class="conversation-meta">
                <span>${new Date(conv.updated_at).toLocaleDateString()}</span>
                <span style="text-transform: capitalize;">${escapeHtml(conv.status)}</span>
            </div>
        </div>
    `).join('');
}

window.selectConversation = async (id) => {
    currentConversationId = id;
    renderConversationsList(); // Update active state
    await loadChatArea(id);
};

async function loadChatArea(conversationId) {
    const chatArea = document.getElementById('chat-area');
    const conversation = conversations.find(c => c.id === conversationId);

    if (!conversation) return;

    // Show loading skeleton
    chatArea.innerHTML = `
        <div class="chat-header">
            <span>${escapeHtml(conversation.subject)}</span>
            <span style="font-size: 12px; font-weight: normal; color: #6b7280;">#${conversationId.slice(0, 8)}</span>
        </div>
        <div class="chat-messages" id="messages-container">
            <div style="text-align:center; padding:20px;"><i data-lucide="loader-2" class="animate-spin"></i> ${i18n.t('messages.chat_loading')}</div>
        </div>
        <div class="chat-input-area">
            <form class="chat-input-form" id="reply-form">
                <input type="text" class="chat-input" placeholder="${i18n.t('messages.chat_placeholder')}" id="reply-input" required>
                <button type="submit" class="btn btn--primary">
                    <i data-lucide="send"></i>
                </button>
            </form>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    // Fetch messages
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error loading messages:', error);
        return;
    }

    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = messages.map(msg => {
        const isMe = msg.sender_id === currentUser.id;
        return `
            <div class="message-bubble ${isMe ? 'message-sent' : 'message-received'}">
                <div class="message-content">${escapeHtml(msg.content)}</div>
                <div class="message-time">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        `;
    }).join('');

    // Scroll to bottom
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 50);

    // Handle Reply
    const replyForm = document.getElementById('reply-form');
    replyForm.onsubmit = async (e) => {
        e.preventDefault();
        const input = document.getElementById('reply-input');
        const content = input.value;
        if (!content.trim()) return;

        await sendMessage(conversationId, content);
        input.value = '';
    };
}

async function createConversation(subject, initialMessage) {
    // 1. Create Conversation
    const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
            user_id: currentUser.id,
            subject: subject,
            status: 'open'
        })
        .select()
        .single();

    if (convError) {
        alert('Error creating conversation: ' + convError.message);
        return;
    }

    // 2. Create Initial Message
    await sendMessage(conv.id, initialMessage);

    // Reload list and select
    await loadConversations();
    window.selectConversation(conv.id);
}

async function sendMessage(conversationId, content) {
    const { error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: currentUser.id,
            content: content
        });

    if (error) {
        alert('Error sending message: ' + error.message);
        return;
    }

    // Refresh chat
    await loadChatArea(conversationId);
}

document.addEventListener('DOMContentLoaded', init);
