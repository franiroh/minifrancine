import { supabase } from './api.js';
import { escapeHtml } from './utils.js';
import { fetchAllOrders } from './api.js'; // Import to hackily get emails

export async function loadAdminMessages() {
    const listContainer = document.getElementById('admin-conversations-list');
    listContainer.innerHTML = '<div style="text-align:center; padding:20px;"><i data-lucide="loader-2" class="animate-spin"></i> Cargando...</div>';
    if (window.lucide) window.lucide.createIcons();

    // 0. specialized fetch for emails (workaround for missing profile.email)
    let emailMap = {};
    try {
        const orders = await fetchAllOrders();
        if (orders) {
            orders.forEach(o => {
                if (o.user_id && o.email) {
                    emailMap[o.user_id] = o.email;
                }
            });
        }
    } catch (e) {
        console.warn('Could not fetch orders for email mapping', e);
    }

    // 1. Fetch conversations with user details
    const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
            *,
            *,
            profiles:user_id (full_name, role)
        `)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching admin conversations:', error);
        listContainer.innerHTML = '<p style="text-align:center; padding:20px; color:red;">Error al cargar mensajes.</p>';
        return;
    }

    console.log('DEBUG: Conversations Data:', conversations);

    if (!conversations || conversations.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; padding:20px;">No hay mensajes.</p>';
        return;
    }

    // 2. Fetch unread counts
    // Get all unread messages sent by users (not admins/me)
    const { data: { user } } = await supabase.auth.getUser();

    // We want messages where conversation_id IN (conversations.ids) AND is_read = false AND sender_id != me
    const convIds = conversations.map(c => c.id);
    const { data: unreadMessages, error: unreadError } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('is_read', false)
        .neq('sender_id', user.id); // Assuming admin is viewing, so unread are those NOT sent by me

    const unreadCounts = {};
    if (unreadMessages) {
        unreadMessages.forEach(msg => {
            unreadCounts[msg.conversation_id] = (unreadCounts[msg.conversation_id] || 0) + 1;
        });
    }

    // Merge counts into conversations
    window.adminConversations = conversations.map(c => ({
        ...c,
        unreadCount: unreadCounts[c.id] || 0
    }));

    window.adminEmails = emailMap;

    renderAdminConversationsList();
}

function renderAdminConversationsList() {
    const listContainer = document.getElementById('admin-conversations-list');
    const previousScroll = listContainer.scrollTop;

    listContainer.innerHTML = window.adminConversations.map(conv => {
        const userEmail = window.adminEmails?.[conv.user_id] || 'N/A';
        const userName = conv.profiles?.full_name || 'Sin Nombre';
        const userRole = conv.profiles?.role || '';

        // Logic: Show Name (bold) + Email (small)
        let primaryText = userName !== 'Sin Nombre' ? userName : (userEmail !== 'N/A' ? userEmail : 'Usuario');
        let secondaryText = (userName !== 'Sin Nombre' && userEmail !== 'N/A') ? userEmail : '';

        const active = window.currentAdminConversationId === conv.id ? 'active' : '';
        const isUnread = conv.unreadCount > 0;

        return `
        <div class="conversation-item ${active} ${isUnread ? 'unread' : ''}" onclick="window.selectAdminConversation('${conv.id}')">
            <div class="conversation-subject">
                ${escapeHtml(conv.subject || 'Sin asunto')}
                ${isUnread ? '<span class="unread-badge"></span>' : ''}
            </div>
            <div class="conversation-preview">
                <div style="font-weight:600; color:var(--text-color);">${escapeHtml(primaryText)}</div>
                ${secondaryText ? `<div style="font-size:12px; color:var(--text-light);">${escapeHtml(secondaryText)}</div>` : ''}
                ${userRole && userRole !== 'user' ? `<div style="font-size:10px; color:var(--primary-color); text-transform:uppercase; font-weight:700;">${escapeHtml(userRole)}</div>` : ''}
            </div>
            <div class="conversation-meta">
                <span>${new Date(conv.updated_at).toLocaleDateString()}</span>
                <span style="text-transform: capitalize;">${escapeHtml(conv.status)}</span>
            </div>
        </div>
    `}).join('');

    listContainer.scrollTop = previousScroll;
}

window.selectAdminConversation = async (id) => {
    window.currentAdminConversationId = id;

    // Optimistic update: mark as read in UI
    const convIndex = window.adminConversations.findIndex(c => c.id === id);
    if (convIndex >= 0) {
        window.adminConversations[convIndex].unreadCount = 0;
    }
    renderAdminConversationsList();

    // Mark as read in DB
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('messages')
        .update({ is_read: true })
        .eq('conversation_id', id)
        .neq('sender_id', user.id); // Mark messages NOT sent by me as read

    await loadAdminChatArea(id);
};

async function loadAdminChatArea(conversationId) {
    const chatArea = document.getElementById('admin-chat-area');
    const conversation = window.adminConversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const userEmail = window.adminEmails?.[conversation.user_id] || 'N/A';
    const userName = conversation.profiles?.full_name || 'Sin Nombre';
    const userRole = conversation.profiles?.role || '';

    let headerDisplay = userName !== 'Sin Nombre' ? userName : (userEmail !== 'N/A' ? userEmail : 'Usuario');
    let subDisplay = (userName !== 'Sin Nombre' && userEmail !== 'N/A') ? userEmail : '';

    // UI
    chatArea.innerHTML = `
        <div class="chat-header">
            <div>
                <span>${escapeHtml(conversation.subject)}</span>
                <div style="font-size: 13px; font-weight: 600; color: var(--text-color); margin-top:2px;">
                    ${escapeHtml(headerDisplay)} 
                    ${subDisplay ? `<span style="font-weight:400; color:#6b7280;">&lt;${escapeHtml(subDisplay)}&gt;</span>` : ''}
                    ${userRole && userRole !== 'user' ? `<span style="font-size:10px; color:var(--primary-color); border:1px solid currentColor; padding:1px 4px; border-radius:4px; margin-left:4px; text-transform:uppercase;">${escapeHtml(userRole)}</span>` : ''}
                </div>
            </div>
            <span style="font-size: 12px; font-weight: normal; color: #6b7280;">#${conversationId.slice(0, 8)}</span>
        </div>
        <div class="chat-messages" id="admin-messages-container">
            <div style="text-align:center; padding:20px;"><i data-lucide="loader-2" class="animate-spin"></i> Cargando...</div>
        </div>
        <div class="chat-input-area">
            <form class="chat-input-form" id="admin-reply-form">
                <input type="text" class="chat-input" placeholder="Escribe una respuesta como admin..." id="admin-reply-input" required>
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

    const messagesContainer = document.getElementById('admin-messages-container');

    messagesContainer.innerHTML = messages.map(msg => {
        const isUser = msg.sender_id === conversation.user_id;
        // If isUser is true, it is received by admin.
        // If isUser is false, it is sent by admin.

        return `
            <div class="message-bubble ${!isUser ? 'message-sent' : 'message-received'}">
                <div class="message-content">${escapeHtml(msg.content)}</div>
                <div class="message-time">
                    ${!isUser ? 'Admin · ' : ''}
                    ${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
            `;
    }).join('');

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Handle Reply
    const replyForm = document.getElementById('admin-reply-form');
    replyForm.onsubmit = async (e) => {
        e.preventDefault();
        const input = document.getElementById('admin-reply-input');
        const content = input.value;
        if (!content.trim()) return;

        // Get current admin user
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: user.id,
                content: content
            });

        if (error) {
            alert('Error sending reply: ' + error.message);
            return;
        }

        // Update conversation timestamp
        await supabase.from('conversations')
            .update({ updated_at: new Date() })
            .eq('id', conversationId);

        // Refresh chat
        await loadAdminChatArea(conversationId);
    };
}
