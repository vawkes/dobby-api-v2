import { NextRequest, NextResponse } from 'next/server';

// Get the API URL from environment variables
const API_URL = process.env.API_URL || 'https://tz45appk53.execute-api.us-west-2.amazonaws.com/prod';

export async function GET(
    request: NextRequest,
    context: { params: { path: string[] } }
) {
    const path = context.params.path.join('/');
    const url = new URL(request.url);
    const apiUrl = `${API_URL}/${path}${url.search}`;

    try {
        console.log(`Proxying GET request to: ${apiUrl}`);
        const response = await fetch(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
                ...(request.headers.get('Authorization')
                    ? { 'Authorization': request.headers.get('Authorization') as string }
                    : {})
            },
            cache: 'no-store',
        });

        const data = await response.json();

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch (error) {
        console.error(`Error proxying GET request to ${apiUrl}:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch data from API' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    context: { params: { path: string[] } }
) {
    const path = context.params.path.join('/');
    const apiUrl = `${API_URL}/${path}`;

    try {
        const body = await request.json();
        console.log(`Proxying POST request to: ${apiUrl}`, body);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(request.headers.get('Authorization')
                    ? { 'Authorization': request.headers.get('Authorization') as string }
                    : {})
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        console.log(`Response from ${apiUrl}:`, data);

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch (error) {
        console.error(`Error proxying POST request to ${apiUrl}:`, error);
        return NextResponse.json(
            { error: 'Failed to send data to API' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: { path: string[] } }
) {
    const path = context.params.path.join('/');
    const apiUrl = `${API_URL}/${path}`;

    try {
        const body = await request.json();
        console.log(`Proxying PUT request to: ${apiUrl}`, body);

        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(request.headers.get('Authorization')
                    ? { 'Authorization': request.headers.get('Authorization') as string }
                    : {})
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch (error) {
        console.error(`Error proxying PUT request to ${apiUrl}:`, error);
        return NextResponse.json(
            { error: 'Failed to update data in API' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: { path: string[] } }
) {
    const path = context.params.path.join('/');
    const url = new URL(request.url);
    const apiUrl = `${API_URL}/${path}${url.search}`;

    try {
        console.log(`Proxying DELETE request to: ${apiUrl}`);
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(request.headers.get('Authorization')
                    ? { 'Authorization': request.headers.get('Authorization') as string }
                    : {})
            },
        });

        const data = await response.json();

        return NextResponse.json(data, {
            status: response.status,
        });
    } catch (error) {
        console.error(`Error proxying DELETE request to ${apiUrl}:`, error);
        return NextResponse.json(
            { error: 'Failed to delete data in API' },
            { status: 500 }
        );
    }
} 