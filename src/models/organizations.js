// Replace this sample data with your real organizations
const organizations = [
    { name: 'Bright Future Builders', contactEmail: 'info@brightfutures.example', logo: 'brightfuture-logo.png' },
    { name: 'Green Harvest Growers', contactEmail: 'hello@greenearth.example', logo: 'greenharvest-logo.png' },
    { name: 'Unity Serve Volunteers', contactEmail: 'team@communitytable.example', logo: 'unityserve-logo.png' }
];

export async function getOrganizations() {
    // TEMPORARY: fake delay so you can see the skeleton. Remove when you use a real database.
    // await new Promise(resolve => setTimeout(resolve, 1500));
    return organizations;
}