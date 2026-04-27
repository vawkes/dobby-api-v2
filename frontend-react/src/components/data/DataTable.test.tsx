import React from 'react';
import { render, screen } from '@testing-library/react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';

type Row = {
    name: string;
};

const columns: ColumnDef<Row>[] = [
    {
        accessorKey: 'name',
        header: 'Name',
    },
];

beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    }));
});

afterEach(() => {
    jest.restoreAllMocks();
});

test('shows zero current pages when there are no rows', () => {
    render(<DataTable data={[]} columns={columns} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(screen.getByText('Page 0 of 0')).toBeInTheDocument();
    expect(screen.queryByText('Page 1 of 0')).not.toBeInTheDocument();
});
