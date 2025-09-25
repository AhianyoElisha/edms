import { format } from 'date-fns'


export const formatPrice = (price: number) => new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
}).format(price)

export const formatDate = (date: string) => {
    const dateString = date;
    let formattedDate;

    try {
    // Attempt to parse the date string
    const date = new Date(dateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
    }

    // Format the date
        formattedDate = format(date, 'MMM dd, yyyy'); // e.g., "Sep 23, 2024"
        return formattedDate;
    } catch (error) {
    console.error('Error parsing date:', error);
    formattedDate = 'Invalid Date';
    }
}

export const formatTime = (date: string) => {
    const dateString = date;
    let formattedDate;

    try {
    // Attempt to parse the date string
        const date = new Date(dateString);

    // Check if the date is valid
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
        }
        // Format the date
        formattedDate = format(date, 'hh:mm a'); // e.g., "Sep 23, 2024"
        return formattedDate;
    } catch (error) {
    console.error('Error parsing date:', error);
    formattedDate = 'Invalid Date';
    }
}
                        