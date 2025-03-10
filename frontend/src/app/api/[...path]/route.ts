import { NextRequest, NextResponse } from 'next/server';

// Get the API URL from environment variables
const API_URL = process.env.API_URL || 'https://tz45appk53.execute-api.us-west-2.amazonaws.com/prod';

export async function GET(
    request: NextRequest,
    context: { params: { path: string[] } }
) {
    const path = await Promise.resolve(context.params.path).then(path => path.join('/'));
    const url = new URL(request.url);
    const apiUrl = `${API_URL}/${path}${url.search}`;

    // Log the authorization header for debugging
    const authHeader = request.headers.get('Authorization');
    console.log(`Authorization header present: ${!!authHeader}`);
    if (authHeader) {
        // Log a censored version of the token for debugging
        const tokenPreview = authHeader.substring(0, 15) + '...' + authHeader.substring(authHeader.length - 5);
        console.log(`Token format: ${tokenPreview}`);
    }

    try {
        console.log(`Proxying GET request to: ${apiUrl}`);
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (authHeader) {
            headers['Authorization'] = authHeader;
            console.log('Adding Authorization header to request');
        } else {
            console.log('WARNING: No Authorization header found in the incoming request');
        }

        const response = await fetch(apiUrl, {
            headers,
            cache: 'no-store',
        });

        console.log(`Response status from ${apiUrl}: ${response.status}`);
        console.log(`Response content-type: ${response.headers.get('content-type')}`);

        // If we get a 401, pass it through but with a clearer message
        if (response.status === 401) {
            let errorMessage = 'Authentication required';

            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // If we can't parse the error as JSON, try to get the text
                try {
                    const errorText = await response.text();
                    if (errorText) {
                        errorMessage = errorText;
                    }
                } catch (textError) {
                    // If we can't get the text, just use the default message
                }
            }

            return NextResponse.json(
                { error: errorMessage, details: 'Your session may have expired. Please log in again.' },
                { status: 401 }
            );
        }

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                const text = await response.text();
                console.error('Response text:', text);
                return NextResponse.json(
                    { error: 'Invalid JSON response from API', details: text.substring(0, 200) },
                    { status: 500 }
                );
            }
        } else {
            const text = await response.text();
            console.error('Non-JSON response received:', text);
            return NextResponse.json(
                { error: 'Non-JSON response from API', details: text.substring(0, 200) },
                { status: 500 }
            );
        }

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
    const path = await Promise.resolve(context.params.path).then(path => path.join('/'));
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

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                const text = await response.text();
                console.error('Response text:', text);
                return NextResponse.json(
                    { error: 'Invalid JSON response from API', details: text.substring(0, 200) },
                    { status: 500 }
                );
            }
        } else {
            const text = await response.text();
            console.error('Non-JSON response received:', text.substring(0, 200));
            return NextResponse.json(
                { error: 'Non-JSON response from API', details: text.substring(0, 200) },
                { status: 500 }
            );
        }

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
    const path = await Promise.resolve(context.params.path).then(path => path.join('/'));
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

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                const text = await response.text();
                console.error('Response text:', text);
                return NextResponse.json(
                    { error: 'Invalid JSON response from API', details: text.substring(0, 200) },
                    { status: 500 }
                );
            }
        } else {
            const text = await response.text();
            console.error('Non-JSON response received:', text.substring(0, 200));
            return NextResponse.json(
                { error: 'Non-JSON response from API', details: text.substring(0, 200) },
                { status: 500 }
            );
        }

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
    const path = await Promise.resolve(context.params.path).then(path => path.join('/'));
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

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                const text = await response.text();
                console.error('Response text:', text);
                return NextResponse.json(
                    { error: 'Invalid JSON response from API', details: text.substring(0, 200) },
                    { status: 500 }
                );
            }
        } else {
            const text = await response.text();
            console.error('Non-JSON response received:', text.substring(0, 200));
            return NextResponse.json(
                { error: 'Non-JSON response from API', details: text.substring(0, 200) },
                { status: 500 }
            );
        }

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