/**
 * SEO Utilities for Dynamic Client-Side SEO Updates
 * This file provides a reusable function to update the page's 
 * title and meta description dynamically based on fetched content.
 */

/**
 * Updates the document title and meta description for SEO purposes.
 * @param {string} title - The title for the page (will be formatted as "Title | Stargaze")
 * @param {string} description - A brief description of the page content (max ~160 chars recommended)
 */
function updateDynamicSEO(title, description) {
    // Update document title with proper format
    if (title && title.trim()) {
        document.title = `${title.trim()} | Stargaze`;
    }

    // Find existing meta description tag
    let metaDescription = document.querySelector('meta[name="description"]');

    // If meta description doesn't exist, create it
    if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
    }

    // Update the content attribute with the new description
    if (description && description.trim()) {
        // Truncate to ~160 characters for optimal SEO
        const truncatedDesc = description.trim().substring(0, 160);
        metaDescription.setAttribute('content', truncatedDesc);
    }
}

// Make the function globally available
window.updateDynamicSEO = updateDynamicSEO;
